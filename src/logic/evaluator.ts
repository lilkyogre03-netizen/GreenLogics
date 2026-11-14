/**
 * Evaluator untuk menghitung nilai kebenaran (true/false) dari AST atau string ekspresi
 * terhadap suatu penugasan (assignment) nilai variabel.
 */

import { parseExpression } from './parser';
import type { ASTNode } from './types';

/**
 * Mengevaluasi pohon sintaks (AST) secara rekursif berdasarkan nilai variabel di `assignment`.
 * Melempar Error apabila ada variabel pada AST yang belum didefinisikan di `assignment`.
 */
export function evaluateAST(
  node: ASTNode,
  assignment: Readonly<Record<string, boolean>>,
): boolean {
  switch (node.type) {
    case 'CONSTANT':
      return node.value;

    case 'VARIABLE': {
      const val = assignment[node.name];
      if (val === undefined) {
        throw new Error(
          `Nilai variabel "${node.name}" tidak ditemukan pada penugasan (assignment) input.`,
        );
      }
      return val;
    }

    case 'NOT':
      return !evaluateAST(node.operand, assignment);

    case 'BINARY': {
      const leftVal = evaluateAST(node.left, assignment);
      const rightVal = evaluateAST(node.right, assignment);

      switch (node.operator) {
        case 'AND':
          return leftVal && rightVal;
        case 'OR':
          return leftVal || rightVal;
        case 'XOR':
          return leftVal !== rightVal;
      }
    }
  }
}

/**
 * Fungsi praktis untuk langsung mem-parse sekaligus mengevaluasi string ekspresi Boolean.
 */
export function evaluateExpression(
  expression: string,
  assignment: Readonly<Record<string, boolean>>,
): boolean {
  const ast = parseExpression(expression);
  return evaluateAST(ast, assignment);
}
