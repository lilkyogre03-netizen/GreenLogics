/**
 * Modul `src/logic`: Engine Aljabar Boolean murni TypeScript.
 * PENTING: Dilarang mengimpor Three.js atau API DOM di dalam folder ini
 * supaya seluruh fungsi logika dapat diuji secara terisolasi lewat unit test.
 */

import type { ActuatorDefinition, SensorDefinition } from './types';

export * from './types';
export * from './parser';
export * from './evaluator';
export * from './truthTable';
export * from './quineMcCluskey';
export * from './booleanLaws';
export * from './equivalence';
export * from './gateGraph';

/** Daftar 6 variabel sensor sesuai spesifikasi model Boolean default */
export const SENSOR_DEFINITIONS: readonly SensorDefinition[] = [
  {
    variable: 'P',
    label: 'Suhu Panas (P)',
    description: 'Suhu melewati batas atas',
  },
  {
    variable: 'D',
    label: 'Suhu Dingin (D)',
    description: 'Suhu di bawah batas bawah',
  },
  {
    variable: 'K',
    label: 'Tanah Kering (K)',
    description: 'Kelembapan tanah rendah',
  },
  {
    variable: 'G',
    label: 'Cahaya Kurang (G)',
    description: 'Intensitas cahaya rendah',
  },
  {
    variable: 'A',
    label: 'Air Tersedia (A)',
    description: 'Tangki air tidak kosong',
  },
  {
    variable: 'M',
    label: 'Malam Hari (M)',
    description: 'Kondisi waktu malam',
  },
];

/**
 * Ekspresi awal sengaja dibuat belum sederhana pada beberapa aktuator
 * agar pengguna dapat mengamati proses penyederhanaan Aljabar Boolean.
 */
export const DEFAULT_ACTUATOR_DEFINITIONS: readonly ActuatorDefinition[] = [
  {
    id: 'waterPump',
    label: 'Pompa Air',
    defaultExpression: '(K ∧ A) ∨ (K ∧ A ∧ ¬P)',
    simplifiedHint: 'K ∧ A',
  },
  {
    id: 'fan',
    label: 'Kipas Pendingin',
    defaultExpression: 'P',
    simplifiedHint: 'P',
  },
  {
    id: 'roofVent',
    label: 'Ventilasi Atap',
    defaultExpression: '(P ∧ ¬D) ∨ (P ∧ M)',
    simplifiedHint: 'P',
  },
  {
    id: 'heater',
    label: 'Pemanas',
    defaultExpression: 'D ∧ M',
    simplifiedHint: 'D ∧ M',
  },
  {
    id: 'growLight',
    label: 'Lampu Grow',
    defaultExpression: 'G ∧ ¬M',
    simplifiedHint: 'G ∧ ¬M',
  },
  {
    id: 'alarm',
    label: 'Alarm Tangki',
    defaultExpression: '¬A ∧ K',
    simplifiedHint: '¬A ∧ K',
  },
];
