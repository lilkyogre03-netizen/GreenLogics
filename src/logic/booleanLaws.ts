/**
 * Mesin Penyederhanaan Bertahap (Step-by-Step Algebraic Simplifier) dan
 * Pendeteksi Hukum Aljabar Boolean untuk keperluan edukasi Matematika Diskrit.
 *
 * Mendukung deteksi berurutan untuk:
 * 1. Hukum Negasi Ganda (Involusi)
 * 2. Hukum De Morgan
 * 3. Hukum Identitas
 * 4. Hukum Dominasi (Null)
 * 5. Hukum Idempoten
 * 6. Hukum Komplemen (Negasi)
 * 7. Hukum Absorpsi
 * 8. Hukum Distributif
 * 9. Constraint Don't-Care Fisik (P ∧ D = 0)
 */

import { formatAST, parseExpression } from './parser';
import { simplifyQuineMcCluskey } from './quineMcCluskey';
import type {
  ASTNode,
  BinaryOperator,
  BooleanLawId,
  BooleanLawInfo,
  SimplificationResult,
  SimplificationStep,
  TruthTableOptions,
} from './types';

/** Katalog referensi hukum-hukum Aljabar Boolean untuk ditampilkan pada UI edukasi */
export const BOOLEAN_LAW_CATALOG: readonly BooleanLawInfo[] = [
  {
    id: 'IDENTITY',
    name: 'Hukum Identitas',
    formulas: ['X ∧ 1 = X', 'X ∨ 0 = X'],
    description:
      'Operasi AND dengan 1 atau OR dengan 0 tidak mengubah nilai kebenaran variabel X.',
  },
  {
    id: 'DOMINATION',
    name: 'Hukum Dominasi (Null)',
    formulas: ['X ∧ 0 = 0', 'X ∨ 1 = 1'],
    description:
      'Operasi AND dengan 0 selalu menghasilkan 0, dan operasi OR dengan 1 selalu menghasilkan 1.',
  },
  {
    id: 'IDEMPOTENT',
    name: 'Hukum Idempoten',
    formulas: ['X ∧ X = X', 'X ∨ X = X'],
    description:
      'Menggabungkan suatu ekspresi dengan dirinya sendiri menggunakan AND atau OR menghasilkan ekspresi itu sendiri.',
  },
  {
    id: 'COMPLEMENT',
    name: 'Hukum Komplemen (Negasi)',
    formulas: ['X ∧ ¬X = 0', 'X ∨ ¬X = 1'],
    description:
      'Suatu variabel yang di-AND-kan dengan komplemennya menghasilkan kontradiksi (0), dan jika di-OR-kan menghasilkan tautologi (1).',
  },
  {
    id: 'DOUBLE_NEGATION',
    name: 'Hukum Negasi Ganda (Involusi)',
    formulas: ['¬(¬X) = X'],
    description:
      'Menegasikan suatu ekspresi dua kali akan mengembalikan nilai aslinya.',
  },
  {
    id: 'DE_MORGAN',
    name: 'Hukum De Morgan',
    formulas: ['¬(X ∧ Y) = ¬X ∨ ¬Y', '¬(X ∨ Y) = ¬X ∧ ¬Y'],
    description:
      'Negasi dari konjungsi adalah disjungsi dari negasi masing-masing operan, dan sebaliknya.',
  },
  {
    id: 'ABSORPTION',
    name: 'Hukum Absorpsi (Penyerapan)',
    formulas: ['X ∨ (X ∧ Y) = X', 'X ∧ (X ∨ Y) = X', 'X ∨ (¬X ∧ Y) = X ∨ Y'],
    description:
      'Suku yang lebih spesifik (X ∧ Y) diserap oleh suku yang lebih umum (X) karena nilai X sudah menentukan hasil akhir.',
  },
  {
    id: 'DISTRIBUTIVE',
    name: 'Hukum Distributif',
    formulas: [
      '(X ∧ Y) ∨ (X ∧ Z) = X ∧ (Y ∨ Z)',
      '(X ∨ Y) ∧ (X ∨ Z) = X ∨ (Y ∧ Z)',
    ],
    description:
      'Faktor yang sama pada dua suku dapat dikeluarkan (difaktorkan) atau dijabarkan seperti aljabar biasa.',
  },
  {
    id: 'DONT_CARE_CONSTRAINT',
    name: "Kondisi Don't-Care Fisik (P ∧ D = 0)",
    formulas: ['P ∧ D = 0', 'P ∧ ¬D = P'],
    description:
      'Pada rumah kaca, suhu tidak mungkin panas (P = 1) sekaligus dingin (D = 1). Jika P bernilai benar, maka D pasti salah (¬D = 1).',
  },
];

interface RewriteMatch {
  readonly newNode: ASTNode;
  readonly lawId: BooleanLawId;
  readonly lawName: string;
  readonly lawFormula: string;
  readonly explanation: string;
}

/** Mengumpulkan daftar suku dari rantai operator asosiatif yang sama (misal A ∧ B ∧ C -> [A, B, C]) */
function flattenAssociative(
  node: ASTNode,
  operator: BinaryOperator,
): ASTNode[] {
  if (node.type === 'BINARY' && node.operator === operator) {
    return [
      ...flattenAssociative(node.left, operator),
      ...flattenAssociative(node.right, operator),
    ];
  }
  return [node];
}

/** Merakit kembali array node menjadi pohon biner asosiatif kiri */
function buildAssociative(
  nodes: readonly ASTNode[],
  operator: BinaryOperator,
): ASTNode {
  if (nodes.length === 0) {
    return { type: 'CONSTANT', value: operator === 'AND' };
  }
  let current = nodes[0]!;
  for (let i = 1; i < nodes.length; i += 1) {
    const next = nodes[i];
    if (next) {
      current = {
        type: 'BINARY',
        operator,
        left: current,
        right: next,
      };
    }
  }
  return current;
}

/** Mengecek apakah node A merupakan negasi langsung dari node B (atau sebaliknya) */
function isComplementPair(nodeA: ASTNode, nodeB: ASTNode): boolean {
  const strA = formatAST(nodeA);
  const strB = formatAST(nodeB);
  if (nodeA.type === 'NOT' && formatAST(nodeA.operand) === strB) {
    return true;
  }
  if (nodeB.type === 'NOT' && formatAST(nodeB.operand) === strA) {
    return true;
  }
  return false;
}

/**
 * Mencoba menerapkan satu aturan Hukum Aljabar Boolean pada satu node AST (tanpa rekursi anak).
 */
function tryRewriteSingleNode(
  node: ASTNode,
  applyGreenhouseConstraint: boolean,
): RewriteMatch | null {
  // 1. Hukum Negasi Ganda & Evaluasi NOT terhadap Konstanta / De Morgan
  if (node.type === 'NOT') {
    const inner = node.operand;

    if (inner.type === 'CONSTANT') {
      const resultVal = !inner.value;
      return {
        newNode: { type: 'CONSTANT', value: resultVal },
        lawId: 'COMPLEMENT',
        lawName: 'Hukum Komplemen',
        lawFormula: inner.value ? '¬1 = 0' : '¬0 = 1',
        explanation: `Negasi dari konstanta ${inner.value ? '1' : '0'} adalah ${resultVal ? '1' : '0'}.`,
      };
    }

    if (inner.type === 'NOT') {
      const targetStr = formatAST(inner.operand);
      return {
        newNode: inner.operand,
        lawId: 'DOUBLE_NEGATION',
        lawName: 'Hukum Negasi Ganda (Involusi)',
        lawFormula: '¬(¬X) = X',
        explanation: `Menghilangkan negasi ganda pada ¬(¬${targetStr}) menjadi ${targetStr}.`,
      };
    }

    if (
      inner.type === 'BINARY' &&
      (inner.operator === 'AND' || inner.operator === 'OR')
    ) {
      const newOp: BinaryOperator = inner.operator === 'AND' ? 'OR' : 'AND';
      const newNode: ASTNode = {
        type: 'BINARY',
        operator: newOp,
        left: { type: 'NOT', operand: inner.left },
        right: { type: 'NOT', operand: inner.right },
      };
      return {
        newNode,
        lawId: 'DE_MORGAN',
        lawName: 'Hukum De Morgan',
        lawFormula:
          inner.operator === 'AND'
            ? '¬(X ∧ Y) = ¬X ∨ ¬Y'
            : '¬(X ∨ Y) = ¬X ∧ ¬Y',
        explanation: `Memecah negasi kurung ${formatAST(node)} menjadi ${formatAST(newNode)} menggunakan Hukum De Morgan.`,
      };
    }
  }

  if (node.type !== 'BINARY') {
    return null;
  }

  const op = node.operator;
  if (op !== 'AND' && op !== 'OR') {
    return null;
  }

  const terms = flattenAssociative(node, op);
  const termStrings = terms.map((t) => formatAST(t));

  // 2. Hukum Dominasi (X ∧ 0 = 0, X ∨ 1 = 1)
  const dominatingVal = op === 'AND' ? false : true;
  const hasDominatingConstant = terms.some(
    (t) => t.type === 'CONSTANT' && t.value === dominatingVal,
  );
  if (hasDominatingConstant && terms.length > 1) {
    return {
      newNode: { type: 'CONSTANT', value: dominatingVal },
      lawId: 'DOMINATION',
      lawName: 'Hukum Dominasi',
      lawFormula: op === 'AND' ? 'X ∧ 0 = 0' : 'X ∨ 1 = 1',
      explanation: `Karena terdapat konstanta ${dominatingVal ? '1' : '0'} pada operasi ${op}, seluruh sub-ekspresi ${formatAST(node)} bernilai ${dominatingVal ? '1' : '0'}.`,
    };
  }

  // 3. Hukum Identitas (X ∧ 1 = X, X ∨ 0 = X)
  const identityVal = op === 'AND' ? true : false;
  const filteredIdentity = terms.filter(
    (t) => !(t.type === 'CONSTANT' && t.value === identityVal),
  );
  if (filteredIdentity.length < terms.length) {
    const newNode =
      filteredIdentity.length > 0
        ? buildAssociative(filteredIdentity, op)
        : ({ type: 'CONSTANT', value: identityVal } satisfies ASTNode);
    return {
      newNode,
      lawId: 'IDENTITY',
      lawName: 'Hukum Identitas',
      lawFormula: op === 'AND' ? 'X ∧ 1 = X' : 'X ∨ 0 = X',
      explanation: `Menghapus elemen identitas ${identityVal ? '1' : '0'} dari ${formatAST(node)} sehingga menjadi ${formatAST(newNode)}.`,
    };
  }

  // 4. Hukum Komplemen (X ∧ ¬X = 0, X ∨ ¬X = 1)
  for (let i = 0; i < terms.length; i += 1) {
    for (let j = i + 1; j < terms.length; j += 1) {
      const tA = terms[i]!;
      const tB = terms[j]!;
      if (isComplementPair(tA, tB)) {
        const resultBool = op === 'OR';
        return {
          newNode: { type: 'CONSTANT', value: resultBool },
          lawId: 'COMPLEMENT',
          lawName: 'Hukum Komplemen',
          lawFormula: op === 'AND' ? 'X ∧ ¬X = 0' : 'X ∨ ¬X = 1',
          explanation: `Suku ${formatAST(tA)} dan komplemennya ${formatAST(tB)} saling meniadakan menjadi ${resultBool ? '1' : '0'}.`,
        };
      }
    }
  }

  // 5. Hukum Idempoten (X ∧ X = X, X ∨ X = X)
  const uniqueTerms: ASTNode[] = [];
  const seenStrings = new Set<string>();
  let duplicateText: string | null = null;

  for (let i = 0; i < terms.length; i += 1) {
    const t = terms[i]!;
    const s = termStrings[i]!;
    if (seenStrings.has(s)) {
      duplicateText = s;
    } else {
      seenStrings.add(s);
      uniqueTerms.push(t);
    }
  }

  if (duplicateText !== null) {
    const newNode = buildAssociative(uniqueTerms, op);
    return {
      newNode,
      lawId: 'IDEMPOTENT',
      lawName: 'Hukum Idempoten',
      lawFormula: op === 'AND' ? 'X ∧ X = X' : 'X ∨ X = X',
      explanation: `Menyederhanakan duplikasi suku ${duplicateText} pada ${formatAST(node)} menjadi ${formatAST(newNode)}.`,
    };
  }

  // 6. Hukum Absorpsi: X ∨ (X ∧ Y) = X atau X ∧ (X ∨ Y) = X
  const dualOp: BinaryOperator = op === 'OR' ? 'AND' : 'OR';
  const termSubsets = terms.map((t) =>
    flattenAssociative(t, dualOp).map((sub) => formatAST(sub)),
  );

  for (let i = 0; i < terms.length; i += 1) {
    for (let j = 0; j < terms.length; j += 1) {
      if (i === j) continue;
      const setA = termSubsets[i]!;
      const setB = termSubsets[j]!;

      // Jika semua faktor di setA ada di dalam setB dan setB memiliki faktor tambahan, maka setB diserap oleh setA
      const isSubset =
        setA.length <= setB.length && setA.every((item) => setB.includes(item));

      if (isSubset) {
        const remaining = terms.filter((_, idx) => idx !== j);
        const newNode = buildAssociative(remaining, op);
        const absorberText = formatAST(terms[i]!);
        const absorbedText = formatAST(terms[j]!);
        return {
          newNode,
          lawId: 'ABSORPTION',
          lawName: 'Hukum Absorpsi',
          lawFormula: op === 'OR' ? 'X ∨ (X ∧ Y) = X' : 'X ∧ (X ∨ Y) = X',
          explanation: `Suku (${absorbedText}) diserap oleh suku (${absorberText}) karena seluruh syarat ${absorberText} sudah tercakup.`,
        };
      }
    }
  }

  // 7. Hukum Absorpsi Komplemen: X ∨ (¬X ∧ Y) = X ∨ Y atau X ∧ (¬X ∨ Y) = X ∧ Y
  for (let i = 0; i < terms.length; i += 1) {
    const unitTerm = terms[i]!;
    for (let j = 0; j < terms.length; j += 1) {
      if (i === j) continue;
      const targetTerm = terms[j]!;
      const subFactors = flattenAssociative(targetTerm, dualOp);
      if (subFactors.length < 2) continue;

      const compIndex = subFactors.findIndex((f) =>
        isComplementPair(unitTerm, f),
      );
      if (compIndex !== -1) {
        const reducedFactors = subFactors.filter((_, idx) => idx !== compIndex);
        const newTarget = buildAssociative(reducedFactors, dualOp);
        const updatedTerms = terms.map((t, idx) => (idx === j ? newTarget : t));
        const newNode = buildAssociative(updatedTerms, op);
        return {
          newNode,
          lawId: 'ABSORPTION',
          lawName: 'Hukum Absorpsi Komplemen',
          lawFormula:
            op === 'OR' ? 'X ∨ (¬X ∧ Y) = X ∨ Y' : 'X ∧ (¬X ∨ Y) = X ∧ Y',
          explanation: `Faktor komplemen ${formatAST(subFactors[compIndex]!)} pada suku (${formatAST(targetTerm)}) tereliminasi oleh ${formatAST(unitTerm)}.`,
        };
      }
    }
  }

  // 8. Constraint Fisik Don't-Care Rumah Kaca pada konjungsi: P ∧ D = 0 dan P ∧ (¬D ∨ M) -> P ∧ (1 ∨ M)
  if (applyGreenhouseConstraint && op === 'AND') {
    const hasP = terms.some((t) => t.type === 'VARIABLE' && t.name === 'P');
    const hasD = terms.some((t) => t.type === 'VARIABLE' && t.name === 'D');

    if (hasP && hasD) {
      return {
        newNode: { type: 'CONSTANT', value: false },
        lawId: 'DONT_CARE_CONSTRAINT',
        lawName: "Kondisi Don't-Care Fisik (P ∧ D = 0)",
        lawFormula: 'P ∧ D = 0',
        explanation:
          'Suhu panas (P) dan dingin (D) tidak mungkin terjadi bersamaan, sehingga P ∧ D disederhanakan menjadi 0.',
      };
    }

    if (hasP) {
      // Cek apakah ada faktor ¬D langsung di dalam konjungsi P ∧ ¬D
      const notDIndex = terms.findIndex(
        (t) =>
          t.type === 'NOT' &&
          t.operand.type === 'VARIABLE' &&
          t.operand.name === 'D',
      );
      if (notDIndex !== -1) {
        const updatedTerms = terms.map((t, idx) =>
          idx === notDIndex
            ? ({ type: 'CONSTANT', value: true } satisfies ASTNode)
            : t,
        );
        const newNode = buildAssociative(updatedTerms, 'AND');
        return {
          newNode,
          lawId: 'DONT_CARE_CONSTRAINT',
          lawName: "Kondisi Don't-Care Fisik (P ∧ D = 0)",
          lawFormula: 'Saat P = 1 maka D = 0 (¬D = 1)',
          explanation:
            'Karena ketika suhu panas (P = 1) suhu tidak mungkin dingin (D = 0), maka ¬D bernilai 1.',
        };
      }

      // Cek apakah ada disjungsi anak yang memuat ¬D, misal P ∧ (¬D ∨ M)
      for (let i = 0; i < terms.length; i += 1) {
        const t = terms[i]!;
        if (t.type === 'BINARY' && t.operator === 'OR') {
          const orSubTerms = flattenAssociative(t, 'OR');
          const subNotDIdx = orSubTerms.findIndex(
            (sub) =>
              sub.type === 'NOT' &&
              sub.operand.type === 'VARIABLE' &&
              sub.operand.name === 'D',
          );
          if (subNotDIdx !== -1) {
            const newOrTerms = orSubTerms.map((sub, sIdx) =>
              sIdx === subNotDIdx
                ? ({ type: 'CONSTANT', value: true } satisfies ASTNode)
                : sub,
            );
            const newOrNode = buildAssociative(newOrTerms, 'OR');
            const updatedTerms = terms.map((item, idx) =>
              idx === i ? newOrNode : item,
            );
            const newNode = buildAssociative(updatedTerms, 'AND');
            return {
              newNode,
              lawId: 'DONT_CARE_CONSTRAINT',
              lawName: "Kondisi Don't-Care Fisik (P ∧ D = 0)",
              lawFormula: 'Saat P = 1 maka ¬D = 1',
              explanation:
                'Di bawah syarat suhu panas (P), kondisi tidak dingin (¬D) pasti bernilai benar (1).',
            };
          }
        }
      }
    }
  }

  // 9. Hukum Distributif (Pemfaktoran): (X ∧ Y) ∨ (X ∧ Z) = X ∧ (Y ∨ Z)
  for (let i = 0; i < terms.length; i += 1) {
    for (let j = i + 1; j < terms.length; j += 1) {
      const factorsA = flattenAssociative(terms[i]!, dualOp);
      const factorsB = flattenAssociative(terms[j]!, dualOp);

      if (factorsA.length < 2 || factorsB.length < 2) {
        continue;
      }

      const strsB = factorsB.map((f) => formatAST(f));
      const commonFactors = factorsA.filter((f) =>
        strsB.includes(formatAST(f)),
      );

      if (commonFactors.length > 0) {
        const commonStrs = new Set(commonFactors.map((f) => formatAST(f)));
        const remA = factorsA.filter((f) => !commonStrs.has(formatAST(f)));
        const remB = factorsB.filter((f) => !commonStrs.has(formatAST(f)));

        if (remA.length > 0 && remB.length > 0) {
          const commonNode = buildAssociative(commonFactors, dualOp);
          const nodeRemA = buildAssociative(remA, dualOp);
          const nodeRemB = buildAssociative(remB, dualOp);
          const factoredPair: ASTNode = {
            type: 'BINARY',
            operator: dualOp,
            left: commonNode,
            right: {
              type: 'BINARY',
              operator: op,
              left: nodeRemA,
              right: nodeRemB,
            },
          };

          const remainingTerms = terms.filter(
            (_, idx) => idx !== i && idx !== j,
          );
          const newNode = buildAssociative(
            [factoredPair, ...remainingTerms],
            op,
          );

          return {
            newNode,
            lawId: 'DISTRIBUTIVE',
            lawName: 'Hukum Distributif',
            lawFormula:
              op === 'OR'
                ? '(X ∧ Y) ∨ (X ∧ Z) = X ∧ (Y ∨ Z)'
                : '(X ∨ Y) ∧ (X ∨ Z) = X ∨ (Y ∧ Z)',
            explanation: `Memfaktorkan suku persekutuan ${formatAST(commonNode)} dari (${formatAST(terms[i]!)}) dan (${formatAST(terms[j]!)}).`,
          };
        }
      }
    }
  }

  return null;
}

/**
 * Mencari satu langkah transformasi Hukum Boolean pada seluruh pohon AST (bottom-up).
 */
function findOneRewriteStepInternal(
  node: ASTNode,
  allowDontCareConstraint: boolean,
): RewriteMatch | null {
  // Coba sederhanakan anak-anaknya terlebih dahulu (bottom-up)
  if (node.type === 'NOT') {
    const childMatch = findOneRewriteStepInternal(
      node.operand,
      allowDontCareConstraint,
    );
    if (childMatch) {
      return {
        ...childMatch,
        newNode: { type: 'NOT', operand: childMatch.newNode },
      };
    }
  } else if (node.type === 'BINARY') {
    const leftMatch = findOneRewriteStepInternal(
      node.left,
      allowDontCareConstraint,
    );
    if (leftMatch) {
      return {
        ...leftMatch,
        newNode: {
          type: 'BINARY',
          operator: node.operator,
          left: leftMatch.newNode,
          right: node.right,
        },
      };
    }

    const rightMatch = findOneRewriteStepInternal(
      node.right,
      allowDontCareConstraint,
    );
    if (rightMatch) {
      return {
        ...rightMatch,
        newNode: {
          type: 'BINARY',
          operator: node.operator,
          left: node.left,
          right: rightMatch.newNode,
        },
      };
    }
  }

  // Jika anak-anak sudah tidak bisa disederhanakan, coba sederhanakan node ini sendiri
  return tryRewriteSingleNode(node, allowDontCareConstraint);
}

/**
 * Memprioritaskan hukum Aljabar Boolean murni (De Morgan, Absorpsi, Distributif, dll.)
 * pada seluruh pohon sebelum menerapkan substitusi kondisi Don't-Care fisik (P ∧ D = 0).
 */
function findOneRewriteStep(
  node: ASTNode,
  applyGreenhouseConstraint: boolean,
): RewriteMatch | null {
  const pureAlgebraicMatch = findOneRewriteStepInternal(node, false);
  if (pureAlgebraicMatch) {
    return pureAlgebraicMatch;
  }
  if (applyGreenhouseConstraint) {
    return findOneRewriteStepInternal(node, true);
  }
  return null;
}

/** Menghitung jumlah kemunculan variabel/literal di dalam AST */
function countASTLiterals(node: ASTNode): number {
  switch (node.type) {
    case 'CONSTANT':
      return 0;
    case 'VARIABLE':
      return 1;
    case 'NOT':
      return countASTLiterals(node.operand);
    case 'BINARY':
      return countASTLiterals(node.left) + countASTLiterals(node.right);
  }
}

/**
 * Menyederhanakan ekspresi Boolean sekaligus melacak langkah-langkah Hukum Aljabar Boolean
 * yang digunakan secara berurutan, dikombinasikan dengan hasil SOP minimal Quine-McCluskey.
 */
export function simplifyWithSteps(
  expressionOrAst: string | ASTNode,
  options?: TruthTableOptions,
): SimplificationResult {
  let currentAst =
    typeof expressionOrAst === 'string'
      ? parseExpression(expressionOrAst)
      : expressionOrAst;
  const originalExpression = formatAST(currentAst);
  const applyGreenhouseConstraint = options?.applyGreenhouseConstraint ?? true;

  const steps: SimplificationStep[] = [];
  const maxIterations = 25;
  const visitedExpressions = new Set<string>([originalExpression]);

  for (let iter = 0; iter < maxIterations; iter += 1) {
    const match = findOneRewriteStep(currentAst, applyGreenhouseConstraint);
    if (!match) {
      break;
    }

    const beforeText = formatAST(currentAst);
    const afterText = formatAST(match.newNode);

    if (visitedExpressions.has(afterText)) {
      break;
    }
    visitedExpressions.add(afterText);

    steps.push({
      stepNumber: steps.length + 1,
      lawId: match.lawId,
      lawName: match.lawName,
      lawFormula: match.lawFormula,
      beforeExpression: beforeText,
      afterExpression: afterText,
      explanation: match.explanation,
    });

    currentAst = match.newNode;
  }

  // Bandingkan dengan hasil SOP minimal dari Quine-McCluskey
  const qmResult = simplifyQuineMcCluskey(currentAst, options);
  const currentText = formatAST(currentAst);
  const qmText = qmResult.minimalExpression;

  // Jika Quine-McCluskey menghasilkan bentuk yang lebih ringkas (literal lebih sedikit), tambahkan langkah final
  if (
    currentText !== qmText &&
    countASTLiterals(qmResult.minimalAST) < countASTLiterals(currentAst)
  ) {
    steps.push({
      stepNumber: steps.length + 1,
      lawId: 'QUINE_MCCLUSKEY',
      lawName: 'Minimisasi Quine-McCluskey (SOP Minimal)',
      lawFormula: 'Reduksi Prime Implicant',
      beforeExpression: currentText,
      afterExpression: qmText,
      explanation: `Mereduksi suku menjadi bentuk Sum of Products (SOP) paling minimal: ${qmText}.`,
    });
    currentAst = qmResult.minimalAST;
  }

  return {
    originalExpression,
    simplifiedExpression: formatAST(currentAst),
    simplifiedAST: currentAst,
    steps,
    quineMcCluskey: qmResult,
  };
}
