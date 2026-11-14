import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ACTUATOR_DEFINITIONS,
  buildGateGraph,
  checkEquivalence,
  simplifyQuineMcCluskey,
  simplifyWithSteps,
} from '../src/logic';

describe('Penyederhanaan Quine-McCluskey, Hukum Boolean, Ekuivalensi, & Gate Graph', () => {
  describe('Algoritma Quine-McCluskey & Model Aktuator Default', () => {
    it('menyederhanakan keenam ekspresi aktuator default sesuai spesifikasi', () => {
      for (const actuator of DEFAULT_ACTUATOR_DEFINITIONS) {
        const qm = simplifyQuineMcCluskey(actuator.defaultExpression);
        expect(qm.minimalExpression).toBe(actuator.simplifiedHint);

        // Pastikan ekspresi awal dan hasil penyederhanaan ekuivalen secara logis
        const eq = checkEquivalence(
          actuator.defaultExpression,
          qm.minimalExpression,
        );
        expect(eq.isEquivalent).toBe(true);
      }
    });

    it('menangani fungsi konstanta kontradiksi (0) dan tautologi (1)', () => {
      const contradiction = simplifyQuineMcCluskey('K ∧ ¬K');
      expect(contradiction.minimalExpression).toBe('0');

      const tautology = simplifyQuineMcCluskey('K ∨ ¬K');
      expect(tautology.minimalExpression).toBe('1');
    });

    it("menyederhanakan ekspresi 4 variabel kompleks dengan kondisi don't-care kustom", () => {
      // f(A,B,C,D) = Σm(0, 1, 2, 5, 6, 7, 8, 9, 10, 14) -> minimal cover 3 Prime Implicants:
      // 1) ¬B ∧ ¬C (mencakup 0, 1, 8, 9)
      // 2) ¬B ∧ ¬D (mencakup 0, 2, 8, 10)
      // 3) ¬A ∧ C ∧ D (mencakup 5, 7) dan B ∧ C ∧ ¬D (mencakup 6, 14) -> dengan don't-care D=1 pada A=1,B=1,C=1 (minterm 15), 5,6,7,14,15 tereduksi!
      const expr =
        '(¬A ∧ ¬B ∧ ¬C) ∨ (¬A ∧ ¬B ∧ ¬D) ∨ (¬A ∧ B ∧ C) ∨ (B ∧ C ∧ ¬D) ∨ (A ∧ ¬B ∧ ¬C) ∨ (A ∧ ¬B ∧ ¬D)';
      const qm = simplifyQuineMcCluskey(expr, {
        variables: ['A', 'B', 'C', 'D'],
        applyGreenhouseConstraint: false,
      });

      const eq = checkEquivalence(expr, qm.minimalExpression, {
        variables: ['A', 'B', 'C', 'D'],
        ignoreDontCare: false,
      });
      expect(eq.isEquivalent).toBe(true);
      // 6 suku awal direduksi menjadi 3 suku Prime Implicant minimal (¬B ∧ ¬C, ¬B ∧ ¬D, dan gabungan suku B ∧ C)
      expect(qm.selectedImplicants).toHaveLength(3);
    });
  });

  describe('Deteksi Langkah Hukum Aljabar Boolean (simplifyWithSteps)', () => {
    it('mendeteksi Hukum Absorpsi pada ekspresi Pompa Air: (K ∧ A) ∨ (K ∧ A ∧ ¬P) -> K ∧ A', () => {
      const result = simplifyWithSteps('(K ∧ A) ∨ (K ∧ A ∧ ¬P)');
      expect(result.simplifiedExpression).toBe('K ∧ A');
      expect(result.steps.length).toBeGreaterThanOrEqual(1);
      expect(result.steps.some((s) => s.lawId === 'ABSORPTION')).toBe(true);
    });

    it('mendeteksi Hukum De Morgan dan Negasi Ganda: ¬(¬K ∨ ¬A) -> K ∧ A', () => {
      const result = simplifyWithSteps('¬(¬K ∨ ¬A)');
      expect(result.simplifiedExpression).toBe('K ∧ A');

      const lawIds = result.steps.map((s) => s.lawId);
      expect(lawIds).toContain('DE_MORGAN');
      expect(lawIds).toContain('DOUBLE_NEGATION');
    });

    it('mendeteksi Hukum Distributif, Komplemen, dan Identitas: (K ∧ A) ∨ (K ∧ ¬A) -> K', () => {
      const result = simplifyWithSteps('(K ∧ A) ∨ (K ∧ ¬A)');
      expect(result.simplifiedExpression).toBe('K');

      const lawIds = result.steps.map((s) => s.lawId);
      expect(lawIds).toContain('DISTRIBUTIVE');
      expect(lawIds).toContain('COMPLEMENT');
      expect(lawIds).toContain('IDENTITY');
    });

    it("mendeteksi Hukum Distributif, Don't-Care (P ∧ D = 0), Dominasi, dan Identitas pada Ventilasi Atap: (P ∧ ¬D) ∨ (P ∧ M) -> P", () => {
      const result = simplifyWithSteps('(P ∧ ¬D) ∨ (P ∧ M)');
      expect(result.simplifiedExpression).toBe('P');

      const lawIds = result.steps.map((s) => s.lawId);
      expect(lawIds).toContain('DISTRIBUTIVE');
      expect(lawIds).toContain('DONT_CARE_CONSTRAINT');
      expect(lawIds).toContain('DOMINATION');
      expect(lawIds).toContain('IDENTITY');
    });

    it('mendeteksi Hukum Idempoten dan Dominasi: (G ∧ G) ∨ 1 -> 1', () => {
      const result = simplifyWithSteps('(G ∧ G) ∨ 1');
      expect(result.simplifiedExpression).toBe('1');

      const lawIds = result.steps.map((s) => s.lawId);
      expect(lawIds).toContain('IDEMPOTENT');
      expect(lawIds).toContain('DOMINATION');
    });
  });

  describe('Pemeriksaan Ekuivalensi (checkEquivalence)', () => {
    it('mengembalikan counterExample ketika dua ekspresi tidak ekuivalen', () => {
      const eq = checkEquivalence('K ∧ A', 'K ∨ A');
      expect(eq.isEquivalent).toBe(false);
      expect(eq.counterExample).not.toBeNull();
    });

    it("membedakan ekuivalensi dengan dan tanpa don't-care P ∧ D", () => {
      // Dengan don't-care P ∧ D (default rumah kaca), (P ∧ ¬D) ∨ (P ∧ M) ekuivalen dengan P
      const withDC = checkEquivalence('(P ∧ ¬D) ∨ (P ∧ M)', 'P', {
        ignoreDontCare: true,
      });
      expect(withDC.isEquivalent).toBe(true);

      // Tanpa don't-care (P=1, D=1, M=0 dianggap mungkin), keduanya tidak ekuivalen
      const withoutDC = checkEquivalence('(P ∧ ¬D) ∨ (P ∧ M)', 'P', {
        ignoreDontCare: false,
      });
      expect(withoutDC.isEquivalent).toBe(false);
      expect(withoutDC.counterExample).toEqual({ P: true, D: true, M: false });
    });
  });

  describe('Konversi AST ke Gate Graph (buildGateGraph)', () => {
    it('membangun node gerbang dan kabel penghubung dengan kedalaman (depth) yang tepat', () => {
      const graph = buildGateGraph('(K ∧ A) ∨ (K ∧ A ∧ ¬P)');

      // Harus memiliki 3 terminal INPUT unik: K, A, P pada depth = 0
      const inputNodes = graph.nodes.filter((n) => n.kind === 'INPUT');
      expect(inputNodes.map((n) => n.label)).toEqual(['K', 'A', 'P']);
      expect(inputNodes.every((n) => n.depth === 0)).toBe(true);

      // Root node adalah gerbang OR dengan depth tertinggi
      const rootNode = graph.nodes.find((n) => n.id === graph.rootNodeId);
      expect(rootNode?.kind).toBe('OR');
      expect(rootNode?.depth).toBe(graph.maxDepth);
      expect(graph.wires.length).toBeGreaterThan(0);
    });
  });
});
