import { describe, expect, it } from 'vitest';
import {
  evaluateExpression,
  generateTruthTable,
  isDontCareCondition,
} from '../src/logic';

describe('Evaluator & Generator Tabel Kebenaran', () => {
  it('mengevaluasi seluruh operator dasar (AND, OR, NOT, XOR, konstanta 0/1)', () => {
    expect(evaluateExpression('1 ∧ 0', {})).toBe(false);
    expect(evaluateExpression('1 ∨ 0', {})).toBe(true);
    expect(evaluateExpression('1 ⊕ 1', {})).toBe(false);
    expect(evaluateExpression('1 ⊕ 0', {})).toBe(true);
    expect(evaluateExpression('¬0', {})).toBe(true);
  });

  it('melempar error informatif jika variabel belum didefinisikan pada assignment', () => {
    expect(() => evaluateExpression('K ∧ A', { K: true })).toThrowError(
      /Nilai variabel "A" tidak ditemukan/,
    );
  });

  it('menghasilkan tabel kebenaran hingga 6 variabel (64 baris) dengan benar', () => {
    const table = generateTruthTable('P ∨ D ∨ K ∨ G ∨ A ∨ M');
    expect(table.variables).toEqual(['P', 'D', 'K', 'G', 'A', 'M']);
    expect(table.rows).toHaveLength(64);

    // Baris pertama (indeks 0: semua false) harus bernilai false ('0')
    expect(table.rows[0]?.result).toBe(false);
    expect(table.rows[0]?.outputSymbol).toBe('0');
  });

  it('menolak pembuatan tabel kebenaran dengan lebih dari 6 variabel', () => {
    expect(() => generateTruthTable('A ∧ B ∧ C ∧ D ∧ E ∧ F ∧ G')).toThrowError(
      /mendukung maksimal 6 variabel/,
    );
  });

  it("menandai kombinasi P = true dan D = true sebagai kondisi don't-care (X)", () => {
    const table = generateTruthTable('(P ∧ ¬D) ∨ (P ∧ M)');
    expect(table.variables).toEqual(['P', 'D', 'M']);
    expect(table.rows).toHaveLength(8);

    // Dari 8 baris (P, D, M), baris dengan P=1 dan D=1 adalah indeks 6 (110) dan 7 (111)
    expect(table.dontCares).toEqual([6, 7]);
    // Baris dengan P=1 dan D=0 adalah indeks 4 (100) dan 5 (101) -> keduanya bernilai '1'
    expect(table.minterms).toEqual([4, 5]);

    for (const row of table.rows) {
      if (isDontCareCondition(row.assignment)) {
        expect(row.isDontCare).toBe(true);
        expect(row.outputSymbol).toBe('X');
      } else {
        expect(row.isDontCare).toBe(false);
      }
    }
  });
});
