import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ACTUATOR_DEFINITIONS,
  SENSOR_DEFINITIONS,
  isDontCareCondition,
} from '../src/logic';

describe('Fase 1 Smoke Test — Spesifikasi Dasar Model Boolean', () => {
  it('memiliki tepat 6 variabel sensor sesuai spesifikasi (P, D, K, G, A, M)', () => {
    const variables = SENSOR_DEFINITIONS.map((s) => s.variable);
    expect(variables).toEqual(['P', 'D', 'K', 'G', 'A', 'M']);
  });

  it('memiliki 6 definisi aktuator default beserta ekspresi awalnya', () => {
    expect(DEFAULT_ACTUATOR_DEFINITIONS).toHaveLength(6);
    const pump = DEFAULT_ACTUATOR_DEFINITIONS.find((a) => a.id === 'waterPump');
    expect(pump?.defaultExpression).toBe('(K ∧ A) ∨ (K ∧ A ∧ ¬P)');
    expect(pump?.simplifiedHint).toBe('K ∧ A');
  });

  it('mendeteksi constraint fisik P dan D true bersamaan sebagai kondisi don\'t-care', () => {
    expect(
      isDontCareCondition({
        P: true,
        D: true,
        K: false,
        G: false,
        A: true,
        M: false,
      }),
    ).toBe(true);

    expect(
      isDontCareCondition({
        P: true,
        D: false,
        K: false,
        G: false,
        A: true,
        M: false,
      }),
    ).toBe(false);
  });
});
