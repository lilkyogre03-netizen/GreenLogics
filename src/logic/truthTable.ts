/**
 * Generator Tabel Kebenaran (Truth Table) untuk ekspresi Aljabar Boolean
 * hingga 6 variabel, lengkap dengan dukungan kondisi don't-care (X).
 */

import { evaluateAST } from './evaluator';
import { extractVariables, parseExpression } from './parser';
import type {
  ASTNode,
  TruthTable,
  TruthTableOptions,
  TruthTableRow,
} from './types';

/** Batas maksimum jumlah variabel untuk tabel kebenaran (2^6 = 64 baris) */
export const MAX_TRUTH_TABLE_VARIABLES = 6;

/**
 * Mengecek apakah kombinasi nilai sensor melanggar constraint fisik rumah kaca:
 * Suhu tidak mungkin panas (P = true) sekaligus dingin (D = true).
 * Kombinasi P ∧ D diperlakukan sebagai kondisi don't-care (X).
 */
export function isDontCareCondition(
  values: Readonly<Record<string, boolean>>,
): boolean {
  return Boolean(values['P'] && values['D']);
}

/**
 * Mengonversi indeks baris (minterm index) menjadi map nilai boolean untuk daftar variabel.
 * Variabel pertama adalah Most Significant Bit (MSB), variabel terakhir adalah LSB.
 */
export function indexToAssignment(
  index: number,
  variables: readonly string[],
): Record<string, boolean> {
  const assignment: Record<string, boolean> = {};
  const count = variables.length;

  for (let i = 0; i < count; i += 1) {
    const varName = variables[i];
    if (varName !== undefined) {
      const bitPosition = count - 1 - i;
      assignment[varName] = ((index >> bitPosition) & 1) === 1;
    }
  }

  return assignment;
}

/**
 * Menghasilkan Tabel Kebenaran lengkap untuk suatu ekspresi Boolean atau AST.
 * Mendukung hingga 6 variabel dan penandaan baris don't-care (X).
 */
export function generateTruthTable(
  expressionOrAst: string | ASTNode,
  options?: TruthTableOptions,
): TruthTable {
  const ast =
    typeof expressionOrAst === 'string'
      ? parseExpression(expressionOrAst)
      : expressionOrAst;

  const extractedVars = extractVariables(ast);
  const variables: string[] = options?.variables
    ? [...options.variables]
    : extractedVars;

  // Pastikan seluruh variabel yang ada di ekspresi tercakup dalam daftar variabel tabel
  for (const v of extractedVars) {
    if (!variables.includes(v)) {
      variables.push(v);
    }
  }

  if (variables.length > MAX_TRUTH_TABLE_VARIABLES) {
    throw new Error(
      `Tabel kebenaran mendukung maksimal ${MAX_TRUTH_TABLE_VARIABLES} variabel, tetapi ditemukan ${variables.length} variabel (${variables.join(', ')}).`,
    );
  }

  const applyGreenhouseConstraint = options?.applyGreenhouseConstraint ?? true;
  const totalRows = 1 << variables.length;
  const rows: TruthTableRow[] = [];
  const minterms: number[] = [];
  const dontCares: number[] = [];

  for (let idx = 0; idx < totalRows; idx += 1) {
    const assignment = indexToAssignment(idx, variables);
    const result = evaluateAST(ast, assignment);

    const isCustomDontCare = options?.dontCarePredicate
      ? options.dontCarePredicate(assignment)
      : false;
    const isGreenhouseDontCare =
      applyGreenhouseConstraint && isDontCareCondition(assignment);
    const isDontCare = isCustomDontCare || isGreenhouseDontCare;

    let outputSymbol: '0' | '1' | 'X';
    if (isDontCare) {
      outputSymbol = 'X';
      dontCares.push(idx);
    } else if (result) {
      outputSymbol = '1';
      minterms.push(idx);
    } else {
      outputSymbol = '0';
    }

    rows.push({
      index: idx,
      assignment,
      result,
      isDontCare,
      outputSymbol,
    });
  }

  return {
    variables,
    rows,
    minterms,
    dontCares,
  };
}
