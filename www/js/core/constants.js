/**
 * @fileoverview Constantes musicales, afinación estándar y catálogos armónicos.
 * Capa de Dominio (sin dependencias del DOM ni de plataforma).
 */
'use strict';

window.FM = window.FM || {};

(function initConstants(FM) {
  const NOTES_SHARP = Object.freeze(['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']);
  const NOTES_FLAT  = Object.freeze(['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']);
  const FLAT_KEYS   = new Set([1, 3, 5, 8, 10]); // Db, Eb, F, Ab, Bb

  // Índices de cuerda s = 0 (6ª cuerda E2 = MIDI 40) hasta s = 5 (1ª cuerda E4 = MIDI 64)
  const OPEN_MIDI    = Object.freeze([40, 45, 50, 55, 59, 64]);
  const STRING_NAMES = Object.freeze(['6E', '5A', '4D', '3G', '2B', '1e']);
  const TOTAL_FRETS  = 22;
  const INLAY_FRETS  = new Set([3, 5, 7, 9, 12, 15, 17, 19, 21]);

  const INTERVAL_NAMES = Object.freeze({
    0: '1', 1: 'b2', 2: '2', 3: 'b3', 4: '3', 5: '4',
    6: 'b5', 7: '5', 8: '#5', 9: '6', 10: 'b7', 11: '7'
  });

  const INTERVAL_SPANISH = Object.freeze({
    1: 'Segunda menor (b2)',
    2: 'Segunda mayor (2)',
    3: 'Tercera menor (b3)',
    4: 'Tercera mayor (3)',
    5: 'Cuarta justa (4)',
    6: 'Tritono (b5 / #4)',
    7: 'Quinta justa (5)',
    8: 'Quinta aumentada (#5 / b6)',
    9: 'Sexta mayor (6)',
    10: 'Séptima menor (b7)',
    11: 'Séptima mayor (7)',
    12: 'Octava justa (8)'
  });

  const CHORD_QUALITIES = Object.freeze([
    {
      id: 'maj', symbol: '', label: 'Mayor', fullName: 'Mayor', group: 'triads',
      intervals: [0, 4, 7], formula: ['1', '3', '5'], triadFallback: [0, 4, 7],
      boxTemplates: [
        { name: 'Forma E', baseStr: 0, rootOffset: 0, offsets: [0, 2, 2, 1, 0, 0] },
        { name: 'Forma A', baseStr: 1, rootOffset: 0, offsets: [null, 0, 2, 2, 2, 0] },
        { name: 'Forma C', baseStr: 1, rootOffset: 3, offsets: [null, 3, 2, 0, 1, 0] },
        { name: 'Forma G', baseStr: 0, rootOffset: 3, offsets: [3, 2, 0, 0, 0, 3] },
        { name: 'Forma D', baseStr: 2, rootOffset: 0, offsets: [null, null, 0, 2, 3, 2] }
      ]
    },
    {
      id: 'min', symbol: 'm', label: 'Menor (m)', fullName: 'Menor', group: 'triads',
      intervals: [0, 3, 7], formula: ['1', 'b3', '5'], triadFallback: [0, 3, 7],
      boxTemplates: [
        { name: 'Forma Em', baseStr: 0, rootOffset: 0, offsets: [0, 2, 2, 0, 0, 0] },
        { name: 'Forma Am', baseStr: 1, rootOffset: 0, offsets: [null, 0, 2, 2, 1, 0] },
        { name: 'Forma Dm', baseStr: 2, rootOffset: 0, offsets: [null, null, 0, 2, 3, 1] },
        { name: 'Forma Cm', baseStr: 1, rootOffset: 3, offsets: [null, 3, 1, 0, 1, null] },
        { name: 'Forma Gm', baseStr: 0, rootOffset: 3, offsets: [3, 1, 0, 0, 3, 3] }
      ]
    },
    {
      id: 'aug', symbol: 'aug', label: 'Aumentado (aug)', fullName: 'Aumentado', group: 'triads',
      intervals: [0, 4, 8], formula: ['1', '3', '#5'], triadFallback: [0, 4, 8],
      intervalOverride: { 8: '#5' },
      boxTemplates: [
        { name: 'Box 6ª Cuerda', baseStr: 0, rootOffset: 0, offsets: [0, 3, 2, 1, 1, null] },
        { name: 'Box 5ª Cuerda (C)', baseStr: 1, rootOffset: 3, offsets: [null, 3, 2, 1, 1, null] },
        { name: 'Box 5ª Cuerda (A)', baseStr: 1, rootOffset: 0, offsets: [null, 0, 3, 2, 2, 1] },
        { name: 'Box 4ª Cuerda', baseStr: 2, rootOffset: 0, offsets: [null, null, 0, 3, 3, 2] }
      ]
    },
    {
      id: 'dim', symbol: 'dim', label: 'Disminuido (dim)', fullName: 'Disminuido', group: 'triads',
      intervals: [0, 3, 6], formula: ['1', 'b3', 'b5'], triadFallback: [0, 3, 6],
      boxTemplates: [
        { name: 'Box 6ª Cuerda', baseStr: 0, rootOffset: 1, offsets: [1, 2, 3, 1, null, null] },
        { name: 'Box 5ª Cuerda', baseStr: 1, rootOffset: 0, offsets: [null, 0, 1, 2, 1, null] },
        { name: 'Box 4ª Cuerda', baseStr: 2, rootOffset: 0, offsets: [null, null, 0, 1, 3, 1] }
      ]
    },
    {
      id: 'add2', symbol: 'add2', label: 'add2 / add9', fullName: 'Mayor add2 (add9)', group: 'triads',
      intervals: [0, 2, 4, 7], formula: ['1', '2', '3', '5'], triadFallback: [0, 2, 4],
      boxTemplates: [
        { name: 'Forma Cadd2', baseStr: 1, rootOffset: 3, offsets: [null, 3, 2, 0, 3, 0] },
        { name: 'Forma Aadd2', baseStr: 1, rootOffset: 0, offsets: [null, 0, 2, 4, 2, 0] },
        { name: 'Forma Eadd2', baseStr: 0, rootOffset: 0, offsets: [0, 2, 4, 1, 0, 0] },
        { name: 'Forma Gadd2', baseStr: 0, rootOffset: 3, offsets: [3, 0, 0, 2, 0, 3] },
        { name: 'Forma Dadd2', baseStr: 1, rootOffset: 3, offsets: [null, 3, 2, 0, 3, 2] }
      ]
    },
    {
      id: 'madd2', symbol: 'm(add2)', label: 'm(add2)', fullName: 'Menor add2 (madd9)', group: 'triads',
      intervals: [0, 2, 3, 7], formula: ['1', '2', 'b3', '5'], triadFallback: [0, 2, 3],
      boxTemplates: [
        { name: 'Forma Em(add2)', baseStr: 0, rootOffset: 0, offsets: [0, 2, 4, 0, 0, 0] },
        { name: 'Forma Am(add2)', baseStr: 1, rootOffset: 0, offsets: [null, 0, 2, 4, 1, 0] },
        { name: 'Box Cm(add2)', baseStr: 1, rootOffset: 2, offsets: [null, 2, 0, 2, 2, 0] }
      ]
    },
    {
      id: 'sus2', symbol: 'sus2', label: 'sus2', fullName: 'Suspendido 2ª', group: 'triads',
      intervals: [0, 2, 7], formula: ['1', '2', '5'], triadFallback: [0, 2, 7],
      boxTemplates: [
        { name: 'Forma Asus2', baseStr: 1, rootOffset: 0, offsets: [null, 0, 2, 2, 0, 0] },
        { name: 'Forma Dsus2', baseStr: 2, rootOffset: 0, offsets: [null, null, 0, 2, 3, 0] },
        { name: 'Forma Esus2', baseStr: 0, rootOffset: 0, offsets: [0, 2, 4, 4, 0, 0] },
        { name: 'Forma Gsus2', baseStr: 0, rootOffset: 3, offsets: [3, 0, 0, 0, 3, 3] }
      ]
    },
    {
      id: 'sus4', symbol: 'sus4', label: 'sus4', fullName: 'Suspendido 4ª', group: 'triads',
      intervals: [0, 5, 7], formula: ['1', '4', '5'], triadFallback: [0, 5, 7],
      boxTemplates: [
        { name: 'Forma Esus4', baseStr: 0, rootOffset: 0, offsets: [0, 2, 2, 2, 0, 0] },
        { name: 'Forma Asus4', baseStr: 1, rootOffset: 0, offsets: [null, 0, 2, 2, 3, 0] },
        { name: 'Forma Dsus4', baseStr: 2, rootOffset: 0, offsets: [null, null, 0, 2, 3, 3] },
        { name: 'Forma Csus4', baseStr: 1, rootOffset: 3, offsets: [null, 3, 3, 0, 1, 1] }
      ]
    },
    {
      id: 'add4', symbol: 'add4', label: 'add4', fullName: 'Mayor add4', group: 'triads',
      intervals: [0, 4, 5, 7], formula: ['1', '3', '4', '5'], triadFallback: [0, 4, 5],
      boxTemplates: [
        { name: 'Forma Cadd4', baseStr: 1, rootOffset: 3, offsets: [null, 3, 2, 0, 1, 1] },
        { name: 'Forma Eadd4', baseStr: 0, rootOffset: 0, offsets: [0, 0, 2, 1, 0, 0] },
        { name: 'Forma Aadd4', baseStr: 1, rootOffset: 0, offsets: [null, 0, 2, 2, 2, 0] }
      ]
    },
    {
      id: 'maj7', symbol: 'maj7', label: 'maj7', fullName: 'Mayor Séptima', group: 'sevenths',
      intervals: [0, 4, 7, 11], formula: ['1', '3', '5', '7'], triadFallback: [0, 4, 11],
      boxTemplates: [
        { name: 'Forma Emaj7', baseStr: 0, rootOffset: 0, offsets: [0, null, 1, 1, 0, null] },
        { name: 'Forma Emaj7 (6c)', baseStr: 0, rootOffset: 0, offsets: [0, 2, 1, 1, 0, 0] },
        { name: 'Forma Amaj7', baseStr: 1, rootOffset: 0, offsets: [null, 0, 2, 1, 2, 0] },
        { name: 'Forma Cmaj7', baseStr: 1, rootOffset: 3, offsets: [null, 3, 2, 0, 0, 0] },
        { name: 'Forma Dmaj7', baseStr: 2, rootOffset: 0, offsets: [null, null, 0, 2, 2, 2] }
      ]
    },
    {
      id: '7', symbol: '7', label: '7 (Dom)', fullName: 'Séptima Dominante', group: 'sevenths',
      intervals: [0, 4, 7, 10], formula: ['1', '3', '5', 'b7'], triadFallback: [0, 4, 10],
      boxTemplates: [
        { name: 'Forma E7', baseStr: 0, rootOffset: 0, offsets: [0, 2, 0, 1, 0, 0] },
        { name: 'Forma A7', baseStr: 1, rootOffset: 0, offsets: [null, 0, 2, 0, 2, 0] },
        { name: 'Forma C7', baseStr: 1, rootOffset: 3, offsets: [null, 3, 2, 3, 1, 0] },
        { name: 'Forma D7', baseStr: 2, rootOffset: 0, offsets: [null, null, 0, 2, 1, 2] },
        { name: 'Forma G7', baseStr: 0, rootOffset: 3, offsets: [3, 2, 0, 0, 0, 1] }
      ]
    },
    {
      id: 'm7', symbol: 'm7', label: 'm7', fullName: 'Menor Séptima', group: 'sevenths',
      intervals: [0, 3, 7, 10], formula: ['1', 'b3', '5', 'b7'], triadFallback: [0, 3, 10],
      boxTemplates: [
        { name: 'Forma Em7', baseStr: 0, rootOffset: 0, offsets: [0, 2, 0, 0, 0, 0] },
        { name: 'Forma Em7 Jazz', baseStr: 0, rootOffset: 0, offsets: [0, null, 0, 0, 0, null] },
        { name: 'Forma Am7', baseStr: 1, rootOffset: 0, offsets: [null, 0, 2, 0, 1, 0] },
        { name: 'Forma Dm7', baseStr: 2, rootOffset: 0, offsets: [null, null, 0, 2, 1, 1] }
      ]
    },
    {
      id: 'm7b5', symbol: 'm7b5', label: 'm7♭5', fullName: 'Semidisminuido (m7b5)', group: 'sevenths',
      intervals: [0, 3, 6, 10], formula: ['1', 'b3', 'b5', 'b7'], triadFallback: [0, 3, 6],
      boxTemplates: [
        { name: 'Box 6ª Cuerda', baseStr: 0, rootOffset: 0, offsets: [0, null, 0, 0, -1, null] },
        { name: 'Box 5ª Cuerda', baseStr: 1, rootOffset: 0, offsets: [null, 0, 1, 0, 1, null] },
        { name: 'Box 4ª Cuerda', baseStr: 2, rootOffset: 0, offsets: [null, null, 0, 1, 1, 1] }
      ]
    },
    {
      id: 'dim7', symbol: 'dim7', label: 'dim7', fullName: 'Séptima Disminuida', group: 'sevenths',
      intervals: [0, 3, 6, 9], formula: ['1', 'b3', 'b5', 'bb7'], triadFallback: [0, 3, 6],
      intervalOverride: { 9: 'bb7' },
      boxTemplates: [
        { name: 'Box 6ª Cuerda', baseStr: 0, rootOffset: 1, offsets: [1, null, 0, 1, 0, null] },
        { name: 'Box 5ª Cuerda', baseStr: 1, rootOffset: 1, offsets: [null, 1, 2, 0, 2, null] },
        { name: 'Box 4ª Cuerda', baseStr: 2, rootOffset: 0, offsets: [null, null, 0, 1, 0, 1] }
      ]
    },
    {
      id: '6', symbol: '6', label: '6', fullName: 'Mayor Sexta', group: 'sevenths',
      intervals: [0, 4, 7, 9], formula: ['1', '3', '5', '6'], triadFallback: [0, 4, 9],
      boxTemplates: [
        { name: 'Forma E6', baseStr: 0, rootOffset: 0, offsets: [0, 2, 2, 1, 2, 0] },
        { name: 'Forma C6', baseStr: 1, rootOffset: 3, offsets: [null, 3, 2, 2, 1, 0] },
        { name: 'Forma A6', baseStr: 1, rootOffset: 0, offsets: [null, 0, 2, 2, 2, 2] },
        { name: 'Forma D6', baseStr: 2, rootOffset: 0, offsets: [null, null, 0, 2, 0, 2] }
      ]
    },
    {
      id: 'm6', symbol: 'm6', label: 'm6', fullName: 'Menor Sexta', group: 'sevenths',
      intervals: [0, 3, 7, 9], formula: ['1', 'b3', '5', '6'], triadFallback: [0, 3, 9],
      boxTemplates: [
        { name: 'Forma Em6', baseStr: 0, rootOffset: 0, offsets: [0, 2, 2, 0, 2, 0] },
        { name: 'Forma Am6', baseStr: 1, rootOffset: 0, offsets: [null, 0, 2, 2, 1, 2] },
        { name: 'Forma Dm6', baseStr: 2, rootOffset: 0, offsets: [null, null, 0, 2, 0, 1] }
      ]
    },
    {
      id: 'mmaj7', symbol: 'm(maj7)', label: 'm(maj7)', fullName: 'Menor Mayor 7ª', group: 'sevenths',
      intervals: [0, 3, 7, 11], formula: ['1', 'b3', '5', '7'], triadFallback: [0, 3, 11],
      boxTemplates: [
        { name: 'Forma Em(maj7)', baseStr: 0, rootOffset: 0, offsets: [0, 2, 1, 0, 0, 0] },
        { name: 'Forma Am(maj7)', baseStr: 1, rootOffset: 0, offsets: [null, 0, 2, 1, 1, 0] },
        { name: 'Forma Dm(maj7)', baseStr: 2, rootOffset: 0, offsets: [null, null, 0, 2, 2, 1] }
      ]
    },
    {
      id: '7aug', symbol: '7#5', label: '7#5 (aug7)', fullName: 'Dominante 7ª Aumentada', group: 'extended',
      intervals: [0, 4, 8, 10], formula: ['1', '3', '#5', 'b7'], triadFallback: [0, 4, 8],
      intervalOverride: { 8: '#5' },
      boxTemplates: [
        { name: 'Box 6ª Cuerda', baseStr: 0, rootOffset: 0, offsets: [0, null, 0, 1, 1, null] },
        { name: 'Box 5ª Cuerda', baseStr: 1, rootOffset: 0, offsets: [null, 0, 2, 0, 2, 1] }
      ]
    },
    {
      id: '7sus4', symbol: '7sus4', label: '7sus4', fullName: 'Dominante 7sus4', group: 'extended',
      intervals: [0, 5, 7, 10], formula: ['1', '4', '5', 'b7'], triadFallback: [0, 5, 10],
      boxTemplates: [
        { name: 'Forma E7sus4', baseStr: 0, rootOffset: 0, offsets: [0, 2, 0, 2, 0, 0] },
        { name: 'Forma A7sus4', baseStr: 1, rootOffset: 0, offsets: [null, 0, 2, 0, 3, 0] },
        { name: 'Forma D7sus4', baseStr: 2, rootOffset: 0, offsets: [null, null, 0, 2, 1, 3] }
      ]
    },
    {
      id: '9', symbol: '9', label: '9', fullName: 'Dominante Novena', group: 'extended',
      intervals: [0, 2, 4, 7, 10], fourVoice: [0, 2, 4, 10], formula: ['1', '3', '5', 'b7', '9'],
      triadFallback: [0, 4, 10],
      boxTemplates: [
        { name: 'Forma C9 (5ª Cuerda)', baseStr: 1, rootOffset: 1, offsets: [null, 1, 0, 1, 1, 1] },
        { name: 'Forma C9 Jazz', baseStr: 1, rootOffset: 1, offsets: [null, 1, 0, 1, 1, null] },
        { name: 'Forma E9 (6ª Cuerda)', baseStr: 0, rootOffset: 0, offsets: [0, 2, 0, 1, 0, 2] }
      ]
    },
    {
      id: 'maj9', symbol: 'maj9', label: 'maj9', fullName: 'Mayor Novena', group: 'extended',
      intervals: [0, 2, 4, 7, 11], fourVoice: [0, 2, 4, 11], formula: ['1', '3', '5', '7', '9'],
      triadFallback: [0, 4, 11],
      boxTemplates: [
        { name: 'Forma Cmaj9 (5ª Cuerda)', baseStr: 1, rootOffset: 1, offsets: [null, 1, 0, 2, 1, null] },
        { name: 'Forma Emaj9 (6ª Cuerda)', baseStr: 0, rootOffset: 0, offsets: [0, 2, 1, 1, 0, 2] }
      ]
    },
    {
      id: 'm9', symbol: 'm9', label: 'm9', fullName: 'Menor Novena', group: 'extended',
      intervals: [0, 2, 3, 7, 10], fourVoice: [0, 2, 3, 10], formula: ['1', 'b3', '5', 'b7', '9'],
      triadFallback: [0, 3, 10],
      boxTemplates: [
        { name: 'Forma Cm9 (5ª Cuerda)', baseStr: 1, rootOffset: 2, offsets: [null, 2, 0, 2, 2, null] },
        { name: 'Forma Em9 (6ª Cuerda)', baseStr: 0, rootOffset: 0, offsets: [0, 2, 0, 0, 0, 2] },
        { name: 'Forma Am9', baseStr: 1, rootOffset: 0, offsets: [null, 0, 2, 4, 1, 3] }
      ]
    }
  ]);

  const DETECTOR_FORMULAS = Object.freeze([
    { intervals: [0, 4, 7], symbol: '', name: 'Mayor', score: 100 },
    { intervals: [0, 3, 7], symbol: 'm', name: 'Menor', score: 100 },
    { intervals: [0, 4, 8], symbol: 'aug', name: 'Aumentado', score: 96 },
    { intervals: [0, 3, 6], symbol: 'dim', name: 'Disminuido', score: 96 },
    { intervals: [0, 2, 7], symbol: 'sus2', name: 'Suspendido 2ª', score: 92 },
    { intervals: [0, 5, 7], symbol: 'sus4', name: 'Suspendido 4ª', score: 92 },
    { intervals: [0, 2, 4, 7], symbol: 'add9', name: 'Mayor add2 / add9', score: 98 },
    { intervals: [0, 2, 4], symbol: 'add9(no5)', name: 'Mayor add2 (sin 5ª)', score: 86 },
    { intervals: [0, 2, 3, 7], symbol: 'm(add9)', name: 'Menor add2 / add9', score: 96 },
    { intervals: [0, 2, 3], symbol: 'm(add2,no5)', name: 'Menor add2 (sin 5ª)', score: 84 },
    { intervals: [0, 4, 5, 7], symbol: 'add4', name: 'Mayor add4', score: 94 },
    { intervals: [0, 3, 5, 7], symbol: 'm(add4)', name: 'Menor add4', score: 92 },
    { intervals: [0, 4, 7, 11], symbol: 'maj7', name: 'Mayor Séptima', score: 99 },
    { intervals: [0, 4, 11], symbol: 'maj7(no5)', name: 'Mayor Séptima (sin 5ª)', score: 90 },
    { intervals: [0, 4, 7, 10], symbol: '7', name: 'Séptima Dominante', score: 99 },
    { intervals: [0, 4, 10], symbol: '7(no5)', name: 'Séptima Dominante (sin 5ª)', score: 90 },
    { intervals: [0, 3, 7, 10], symbol: 'm7', name: 'Menor Séptima', score: 99 },
    { intervals: [0, 3, 10], symbol: 'm7(no5)', name: 'Menor Séptima (sin 5ª)', score: 90 },
    { intervals: [0, 3, 6, 10], symbol: 'm7b5', name: 'Semidisminuido', score: 98 },
    { intervals: [0, 3, 6, 9], symbol: 'dim7', name: 'Séptima Disminuida', score: 98 },
    { intervals: [0, 4, 7, 9], symbol: '6', name: 'Mayor Sexta', score: 95 },
    { intervals: [0, 3, 7, 9], symbol: 'm6', name: 'Menor Sexta', score: 95 },
    { intervals: [0, 3, 7, 11], symbol: 'm(maj7)', name: 'Menor Mayor 7ª', score: 96 },
    { intervals: [0, 3, 11], symbol: 'm(maj7,no5)', name: 'Menor Mayor 7ª (sin 5ª)', score: 87 },
    { intervals: [0, 4, 8, 10], symbol: '7#5', name: 'Dominante 7ª Aumentada', score: 95 },
    { intervals: [0, 4, 8, 11], symbol: 'maj7#5', name: 'Mayor 7ª Aumentada', score: 95 },
    { intervals: [0, 4, 6, 10], symbol: '7b5', name: 'Dominante 7b5', score: 94 },
    { intervals: [0, 5, 7, 10], symbol: '7sus4', name: 'Dominante 7sus4', score: 95 },
    { intervals: [0, 5, 10], symbol: '7sus4(no5)', name: 'Dominante 7sus4 (sin 5ª)', score: 86 },
    { intervals: [0, 2, 7, 10], symbol: '7sus2', name: 'Dominante 7sus2', score: 93 },
    { intervals: [0, 2, 4, 7, 10], symbol: '9', name: 'Dominante Novena', score: 98 },
    { intervals: [0, 2, 4, 10], symbol: '9(no5)', name: 'Dominante Novena (sin 5ª)', score: 94 },
    { intervals: [0, 2, 4, 7, 11], symbol: 'maj9', name: 'Mayor Novena', score: 98 },
    { intervals: [0, 2, 4, 11], symbol: 'maj9(no5)', name: 'Mayor Novena (sin 5ª)', score: 94 },
    { intervals: [0, 2, 3, 7, 10], symbol: 'm9', name: 'Menor Novena', score: 98 },
    { intervals: [0, 2, 3, 10], symbol: 'm9(no5)', name: 'Menor Novena (sin 5ª)', score: 94 },
    { intervals: [0, 2, 4, 7, 9], symbol: '6/9', name: 'Sexta con Novena', score: 96 },
    { intervals: [0, 2, 4, 9], symbol: '6/9(no5)', name: '6/9 (sin 5ª)', score: 91 },
    { intervals: [0, 1, 4, 7, 10], symbol: '7b9', name: 'Dominante 7b9', score: 95 },
    { intervals: [0, 1, 4, 10], symbol: '7b9(no5)', name: 'Dominante 7b9 (sin 5ª)', score: 91 },
    { intervals: [0, 3, 4, 7, 10], symbol: '7#9', name: 'Dominante 7#9 (Hendrix)', score: 96 },
    { intervals: [0, 3, 4, 10], symbol: '7#9(no5)', name: 'Dominante 7#9 (sin 5ª)', score: 92 },
    { intervals: [0, 4, 6, 7, 11], symbol: 'maj7#11', name: 'Mayor 7ª Lidia (#11)', score: 95 },
    { intervals: [0, 4, 6, 11], symbol: 'maj7#11(no5)', name: 'Mayor 7#11 (sin 5ª)', score: 91 },
    { intervals: [0, 3, 5, 7, 10], symbol: 'm11', name: 'Menor Oncena', score: 95 },
    { intervals: [0, 3, 5, 10], symbol: 'm11(no5)', name: 'Menor 11ª (sin 5ª)', score: 90 },
    { intervals: [0, 4, 7, 9, 10], symbol: '13', name: 'Dominante Trecena', score: 95 },
    { intervals: [0, 4, 9, 10], symbol: '13(no5)', name: 'Dominante 13ª (sin 5ª)', score: 91 }
  ]);

  FM.constants = {
    NOTES_SHARP,
    NOTES_FLAT,
    FLAT_KEYS,
    OPEN_MIDI,
    STRING_NAMES,
    TOTAL_FRETS,
    INLAY_FRETS,
    INTERVAL_NAMES,
    INTERVAL_SPANISH,
    CHORD_QUALITIES,
    DETECTOR_FORMULAS
  };
})(window.FM);
