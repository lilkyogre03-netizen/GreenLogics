import { describe, expect, it } from 'vitest';
import {
  BooleanParseError,
  evaluateExpression,
  extractVariables,
  formatAST,
  parseExpression,
  tokenize,
} from '../src/logic';

describe('Tokenizer & Parser Ekspresi Boolean', () => {
  it('mengenali simbol matematika (¬, ∧, ∨, ⊕) maupun simbol alternatif (!, ~, &, |, ^, AND, OR, NOT, XOR)', () => {
    const tokensMath = tokenize('¬P ∧ (K ∨ G) ⊕ M');
    expect(tokensMath.map((t) => t.type)).toEqual([
      'NOT',
      'VARIABLE',
      'AND',
      'LPAREN',
      'VARIABLE',
      'OR',
      'VARIABLE',
      'RPAREN',
      'XOR',
      'VARIABLE',
      'EOF',
    ]);

    const tokensAlt = tokenize('!p && (k || g) xor NOT m');
    expect(tokensAlt.map((t) => t.type)).toEqual([
      'NOT',
      'VARIABLE',
      'AND',
      'LPAREN',
      'VARIABLE',
      'OR',
      'VARIABLE',
      'RPAREN',
      'XOR',
      'NOT',
      'VARIABLE',
      'EOF',
    ]);
  });

  it('mematuhi urutan presedensi operator: () > NOT > AND > XOR > OR', () => {
    // P ∨ D ∧ K harus dievaluasi sebagai P ∨ (D ∧ K), bukan (P ∨ D) ∧ K
    const ast1 = parseExpression('P ∨ D ∧ K');
    expect(formatAST(ast1)).toBe('P ∨ (D ∧ K)');
    // Saat P = 1, D = 0, K = 0:
    // P ∨ (D ∧ K) = 1 ∨ 0 = 1 (sedangkan (P ∨ D) ∧ K = 1 ∧ 0 = 0)
    expect(
      evaluateExpression('P ∨ D ∧ K', { P: true, D: false, K: false }),
    ).toBe(true);

    // ¬P ∧ K harus dievaluasi sebagai (¬P) ∧ K, bukan ¬(P ∧ K)
    const ast2 = parseExpression('¬P ∧ K');
    expect(ast2.type).toBe('BINARY');
    expect(evaluateExpression('¬P ∧ K', { P: false, K: false })).toBe(false);

    // Presedensi penuh: P ∨ D ⊕ K ∧ ¬G -> P ∨ (D ⊕ (K ∧ ¬G))
    const ast3 = parseExpression('P ∨ D ⊕ K ∧ ¬G');
    expect(formatAST(ast3)).toBe('P ∨ (D ⊕ (K ∧ ¬G))');
  });

  it('menangani tanda kurung bersarang untuk mengubah urutan evaluasi', () => {
    const expr = '((P ∨ D) ∧ (K ∨ ¬G))';
    const ast = parseExpression(expr);
    expect(formatAST(ast)).toBe('(P ∨ D) ∧ (K ∨ ¬G)');
    expect(
      evaluateExpression(expr, { P: true, D: false, K: false, G: true }),
    ).toBe(false);
    expect(
      evaluateExpression(expr, { P: true, D: false, K: false, G: false }),
    ).toBe(true);
  });

  it('mengekstrak variabel unik sesuai urutan kemunculan di dalam ekspresi', () => {
    expect(extractVariables('(K ∧ A) ∨ (K ∧ A ∧ ¬P)')).toEqual(['K', 'A', 'P']);
    expect(extractVariables('1 ∨ 0')).toEqual([]);
  });

  describe('Penanganan Ekspresi Tidak Valid (Error Informatif)', () => {
    it('menolak ekspresi kosong atau hanya spasi', () => {
      expect(() => parseExpression('')).toThrowError(BooleanParseError);
      expect(() => parseExpression('   ')).toThrowError(/tidak boleh kosong/i);
    });

    it('menolak tanda kurung yang tidak seimbang atau kosong', () => {
      expect(() => parseExpression('(K ∧ A')).toThrowError(
        /tidak memiliki pasangan kurung tutup/i,
      );
      expect(() => parseExpression('K ∧ A)')).toThrowError(
        /tidak memiliki pasangan kurung buka/i,
      );
      expect(() => parseExpression('()')).toThrowError(/kurung kosong/i);
    });

    it('menolak operator biner yang kehilangan operan kiri atau kanan', () => {
      expect(() => parseExpression('K ∧')).toThrowError(
        /kehilangan operan kanan/i,
      );
      expect(() => parseExpression('∨ K')).toThrowError(
        /kehilangan operan kiri/i,
      );
      expect(() => parseExpression('K ∧ ∨ A')).toThrowError(
        /tidak boleh langsung mengikuti operator/i,
      );
    });

    it('menolak operator NOT tanpa operan setelahnya', () => {
      expect(() => parseExpression('K ∧ ¬')).toThrowError(
        /membutuhkan operan setelahnya/i,
      );
    });

    it('menolak variabel multi-huruf atau dua variabel tanpa operator beserta informasi posisi', () => {
      try {
        parseExpression('K ∧ PK');
        expect.fail('Seharusnya melempar BooleanParseError');
      } catch (err) {
        expect(err).toBeInstanceOf(BooleanParseError);
        const parseErr = err as BooleanParseError;
        expect(parseErr.position).toBe(4);
        expect(parseErr.message).toMatch(/Identifier "PK"/);
      }

      expect(() => parseExpression('K A')).toThrowError(/tidak terduga/i);
    });

    it('menolak karakter ilegal dengan posisi karakter yang akurat', () => {
      try {
        parseExpression('K ∧ @');
        expect.fail('Seharusnya melempar BooleanParseError');
      } catch (err) {
        expect(err).toBeInstanceOf(BooleanParseError);
        const parseErr = err as BooleanParseError;
        expect(parseErr.position).toBe(4);
        expect(parseErr.message).toMatch(/Karakter tidak dikenal "@"/);
      }
    });
  });
});
