/**
 * Pemeriksa Ekuivalensi Logis (Logical Equivalence Checker) antara dua ekspresi Boolean
 * dengan membandingkan hasil evaluasi pada seluruh baris tabel kebenaran yang valid.
 */

import { evaluateAST } from './evaluator';
import { extractVariables, parseExpression } from './parser';
import {
  MAX_TRUTH_TABLE_VARIABLES,
  indexToAssignment,
  isDontCareCondition,
} from './truthTable';
import type { ASTNode, EquivalenceOptions, EquivalenceResult } from './types';

/**
 * Membandingkan dua ekspresi Boolean atau AST untuk menentukan apakah keduanya ekuivalen.
 * Secara default mengabaikan kondisi don't-care fisik rumah kaca (P ∧ D = true).
 */
export function checkEquivalence(
  exprA: string | ASTNode,
  exprB: string | ASTNode,
  options?: EquivalenceOptions,
): EquivalenceResult {
  const astA = typeof exprA === 'string' ? parseExpression(exprA) : exprA;
  const astB = typeof exprB === 'string' ? parseExpression(exprB) : exprB;

  const varsA = extractVariables(astA);
  const varsB = extractVariables(astB);

  const variableSet = new Set<string>(options?.variables ?? []);
  for (const v of varsA) {
    variableSet.add(v);
  }
  for (const v of varsB) {
    variableSet.add(v);
  }

  const variables = [...variableSet];
  if (variables.length > MAX_TRUTH_TABLE_VARIABLES) {
    throw new Error(
      `Pemeriksaan ekuivalensi mendukung maksimal ${MAX_TRUTH_TABLE_VARIABLES} variabel gabungan, ditemukan ${variables.length}.`,
    );
  }

  const ignoreDontCare = options?.ignoreDontCare ?? true;
  const totalRows = 1 << variables.length;

  for (let idx = 0; idx < totalRows; idx += 1) {
    const assignment = indexToAssignment(idx, variables);

    if (ignoreDontCare) {
      const isCustomDC = options?.dontCarePredicate
        ? options.dontCarePredicate(assignment)
        : false;
      const isGreenhouseDC = isDontCareCondition(assignment);
      if (isCustomDC || isGreenhouseDC) {
        continue;
      }
    }

    const valA = evaluateAST(astA, assignment);
    const valB = evaluateAST(astB, assignment);

    if (valA !== valB) {
      return {
        isEquivalent: false,
        variables,
        counterExample: assignment,
      };
    }
  }

  return {
    isEquivalent: true,
    variables,
    counterExample: null,
  };
}
