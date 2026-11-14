/**
 * Implementasi Algoritma Quine-McCluskey (Metode Tabulasi) untuk menyederhanakan
 * fungsi Aljabar Boolean menjadi bentuk Sum of Products (SOP) minimal,
 * lengkap dengan dukungan kondisi don't-care (X).
 */

import { formatAST, parseExpression } from './parser';
import { generateTruthTable } from './truthTable';
import type {
  ASTNode,
  PrimeImplicant,
  QuineMcCluskeyResult,
  TruthTableOptions,
} from './types';

interface InternalTerm {
  readonly pattern: string;
  readonly coveredTerms: readonly number[];
}

/** Mengubah bilangan bulat non-negatif menjadi string biner sepanjang `width` bit */
function toBinaryPattern(num: number, width: number): string {
  return num.toString(2).padStart(width, '0');
}

/** Menghitung jumlah karakter '1' pada suatu pola bit */
function countOnes(pattern: string): number {
  let count = 0;
  for (let i = 0; i < pattern.length; i += 1) {
    if (pattern[i] === '1') {
      count += 1;
    }
  }
  return count;
}

/** Menghitung jumlah literal aktif (bukan '-') pada suatu pola implicant */
function countLiterals(pattern: string): number {
  let count = 0;
  for (let i = 0; i < pattern.length; i += 1) {
    if (pattern[i] !== '-') {
      count += 1;
    }
  }
  return count;
}

/**
 * Mencoba menggabungkan dua pola implicant jika keduanya hanya berbeda tepat 1 bit.
 * Mengembalikan pola gabungan dengan '-' pada bit yang berbeda, atau null jika tidak bisa digabung.
 */
function tryCombinePatterns(patA: string, patB: string): string | null {
  if (patA.length !== patB.length) {
    return null;
  }

  let diffIndex = -1;
  for (let i = 0; i < patA.length; i += 1) {
    const chA = patA[i];
    const chB = patB[i];
    if (chA !== chB) {
      // Jika salah satu adalah '-' sedangkan yang lain bukan, posisi '-' tidak sejajar
      if (chA === '-' || chB === '-') {
        return null;
      }
      if (diffIndex !== -1) {
        return null; // Berbeda lebih dari 1 bit
      }
      diffIndex = i;
    }
  }

  if (diffIndex === -1) {
    return null;
  }

  return `${patA.slice(0, diffIndex)}-${patA.slice(diffIndex + 1)}`;
}

/**
 * Mengubah pola bit implicant (misal '1-0') menjadi ASTNode konjungsi (misal P ∧ ¬M).
 */
function patternToAST(pattern: string, variables: readonly string[]): ASTNode {
  const literals: ASTNode[] = [];

  for (let i = 0; i < pattern.length; i += 1) {
    const bit = pattern[i];
    const varName = variables[i];
    if (varName === undefined || bit === '-') {
      continue;
    }

    const varNode: ASTNode = { type: 'VARIABLE', name: varName };
    if (bit === '1') {
      literals.push(varNode);
    } else if (bit === '0') {
      literals.push({ type: 'NOT', operand: varNode });
    }
  }

  if (literals.length === 0) {
    return { type: 'CONSTANT', value: true };
  }

  let current = literals[0]!;
  for (let i = 1; i < literals.length; i += 1) {
    const nextLit = literals[i];
    if (nextLit) {
      current = {
        type: 'BINARY',
        operator: 'AND',
        left: current,
        right: nextLit,
      };
    }
  }

  return current;
}

/**
 * Tahap 1 Quine-McCluskey: Mencari seluruh Prime Implicant dari daftar minterm + don't-care.
 */
function findPrimeImplicants(
  allTerms: readonly number[],
  numVars: number,
): InternalTerm[] {
  let currentLevel: InternalTerm[] = allTerms.map((term) => ({
    pattern: toBinaryPattern(term, numVars),
    coveredTerms: [term],
  }));

  const primeMap = new Map<string, InternalTerm>();

  while (currentLevel.length > 0) {
    const groups = new Map<number, InternalTerm[]>();
    for (const item of currentLevel) {
      const ones = countOnes(item.pattern);
      const list = groups.get(ones);
      if (list) {
        list.push(item);
      } else {
        groups.set(ones, [item]);
      }
    }

    const combinedFlags = new Set<string>();
    const nextLevelMap = new Map<string, InternalTerm>();
    const sortedGroupKeys = [...groups.keys()].sort((a, b) => a - b);

    for (let gIdx = 0; gIdx < sortedGroupKeys.length; gIdx += 1) {
      const keyA = sortedGroupKeys[gIdx];
      if (keyA === undefined) continue;
      const groupA = groups.get(keyA) ?? [];
      const groupB = groups.get(keyA + 1) ?? [];

      for (const itemA of groupA) {
        for (const itemB of groupB) {
          const mergedPattern = tryCombinePatterns(
            itemA.pattern,
            itemB.pattern,
          );
          if (mergedPattern !== null) {
            combinedFlags.add(itemA.pattern);
            combinedFlags.add(itemB.pattern);

            if (!nextLevelMap.has(mergedPattern)) {
              const mergedCovered = Array.from(
                new Set([...itemA.coveredTerms, ...itemB.coveredTerms]),
              ).sort((a, b) => a - b);

              nextLevelMap.set(mergedPattern, {
                pattern: mergedPattern,
                coveredTerms: mergedCovered,
              });
            }
          }
        }
      }
    }

    // Semua implicant yang tidak dapat digabung lagi menjadi Prime Implicant
    for (const item of currentLevel) {
      if (!combinedFlags.has(item.pattern) && !primeMap.has(item.pattern)) {
        primeMap.set(item.pattern, item);
      }
    }

    currentLevel = [...nextLevelMap.values()];
  }

  return [...primeMap.values()];
}

/**
 * Tahap 2 Quine-McCluskey: Memilih himpunan Prime Implicant minimal yang mencakup
 * seluruh minterm (menggunakan Essential Prime Implicants + Branch-and-Bound exact cover).
 */
function selectMinimalCover(
  primeImplicants: readonly InternalTerm[],
  minterms: readonly number[],
): Set<string> {
  const selectedPatterns = new Set<string>();
  const uncoveredMinterms = new Set<number>(minterms);

  // 1. Cari Essential Prime Implicants (EPI)
  for (const m of minterms) {
    const coveringPIs = primeImplicants.filter((pi) =>
      pi.coveredTerms.includes(m),
    );
    if (coveringPIs.length === 1) {
      const essential = coveringPIs[0];
      if (essential) {
        selectedPatterns.add(essential.pattern);
      }
    }
  }

  // Hapus minterm yang sudah dicakup oleh EPI
  for (const pi of primeImplicants) {
    if (selectedPatterns.has(pi.pattern)) {
      for (const m of pi.coveredTerms) {
        uncoveredMinterms.delete(m);
      }
    }
  }

  if (uncoveredMinterms.size === 0) {
    return selectedPatterns;
  }

  // 2. Branch-and-Bound untuk mencakup sisa minterm dengan biaya (jumlah suku & jumlah literal) terkecil
  const remainingMinterms = [...uncoveredMinterms];
  const candidatePIs = primeImplicants.filter(
    (pi) =>
      !selectedPatterns.has(pi.pattern) &&
      pi.coveredTerms.some((m) => uncoveredMinterms.has(m)),
  );

  let bestSubset: InternalTerm[] | null = null;
  let bestTermCount = Number.POSITIVE_INFINITY;
  let bestLiteralCount = Number.POSITIVE_INFINITY;

  function search(
    mintermIdx: number,
    chosen: InternalTerm[],
    coveredNow: Set<number>,
    currentLiterals: number,
  ): void {
    // Pruning jika sudah melebihi solusi terbaik saat ini
    if (
      chosen.length > bestTermCount ||
      (chosen.length === bestTermCount && currentLiterals >= bestLiteralCount)
    ) {
      return;
    }

    // Cari minterm pertama yang belum tercakup
    let nextUncoveredIdx = mintermIdx;
    while (
      nextUncoveredIdx < remainingMinterms.length &&
      coveredNow.has(remainingMinterms[nextUncoveredIdx]!)
    ) {
      nextUncoveredIdx += 1;
    }

    // Jika semua minterm sudah tercakup, simpan sebagai solusi terbaik baru
    if (nextUncoveredIdx >= remainingMinterms.length) {
      bestSubset = [...chosen];
      bestTermCount = chosen.length;
      bestLiteralCount = currentLiterals;
      return;
    }

    const targetMinterm = remainingMinterms[nextUncoveredIdx]!;
    const options = candidatePIs.filter((pi) =>
      pi.coveredTerms.includes(targetMinterm),
    );

    for (const option of options) {
      const nextCovered = new Set(coveredNow);
      for (const m of option.coveredTerms) {
        if (uncoveredMinterms.has(m)) {
          nextCovered.add(m);
        }
      }
      chosen.push(option);
      search(
        nextUncoveredIdx + 1,
        chosen,
        nextCovered,
        currentLiterals + countLiterals(option.pattern),
      );
      chosen.pop();
    }
  }

  search(0, [], new Set<number>(), 0);

  if (bestSubset) {
    for (const pi of bestSubset as InternalTerm[]) {
      selectedPatterns.add(pi.pattern);
    }
  }

  return selectedPatterns;
}

/**
 * Menyederhanakan ekspresi Boolean menggunakan algoritma Quine-McCluskey
 * dan menghasilkan bentuk SOP (Sum of Products) minimal.
 */
export function simplifyQuineMcCluskey(
  expressionOrAst: string | ASTNode,
  options?: TruthTableOptions,
): QuineMcCluskeyResult {
  const originalAst =
    typeof expressionOrAst === 'string'
      ? parseExpression(expressionOrAst)
      : expressionOrAst;
  const originalExpression = formatAST(originalAst);

  const table = generateTruthTable(originalAst, options);
  const { variables, minterms, dontCares } = table;
  const totalRows = 1 << variables.length;

  // Kasus 1: Kontradiksi (tidak ada minterm bernilai 1)
  if (minterms.length === 0) {
    const zeroAst: ASTNode = { type: 'CONSTANT', value: false };
    return {
      originalExpression,
      minimalExpression: '0',
      minimalAST: zeroAst,
      variables,
      minterms,
      dontCares,
      primeImplicants: [],
      selectedImplicants: [],
    };
  }

  // Kasus 2: Tautologi pada seluruh domain valid (minterms + dontCares mencakup seluruh tabel)
  if (minterms.length + dontCares.length === totalRows) {
    const oneAst: ASTNode = { type: 'CONSTANT', value: true };
    const tautologyImplicant: PrimeImplicant = {
      pattern: '-'.repeat(variables.length),
      coveredTerms: [...minterms, ...dontCares].sort((a, b) => a - b),
      termExpression: '1',
      isSelected: true,
    };
    return {
      originalExpression,
      minimalExpression: '1',
      minimalAST: oneAst,
      variables,
      minterms,
      dontCares,
      primeImplicants: [tautologyImplicant],
      selectedImplicants: [tautologyImplicant],
    };
  }

  const allTerms = [...minterms, ...dontCares].sort((a, b) => a - b);
  const rawPrimeImplicants = findPrimeImplicants(allTerms, variables.length);
  const selectedPatterns = selectMinimalCover(rawPrimeImplicants, minterms);

  const primeImplicants: PrimeImplicant[] = rawPrimeImplicants.map((pi) => {
    const termAst = patternToAST(pi.pattern, variables);
    return {
      pattern: pi.pattern,
      coveredTerms: pi.coveredTerms,
      termExpression: formatAST(termAst),
      isSelected: selectedPatterns.has(pi.pattern),
    };
  });

  const selectedImplicants = primeImplicants.filter((pi) => pi.isSelected);

  // Bangun AST SOP gabungan dari seluruh Prime Implicant terpilih
  const termAsts = selectedImplicants.map((pi) =>
    patternToAST(pi.pattern, variables),
  );

  let minimalAST: ASTNode = termAsts[0] ?? { type: 'CONSTANT', value: false };
  for (let i = 1; i < termAsts.length; i += 1) {
    const nextAst = termAsts[i];
    if (nextAst) {
      minimalAST = {
        type: 'BINARY',
        operator: 'OR',
        left: minimalAST,
        right: nextAst,
      };
    }
  }

  return {
    originalExpression,
    minimalExpression: formatAST(minimalAST),
    minimalAST,
    variables,
    minterms,
    dontCares,
    primeImplicants,
    selectedImplicants,
  };
}
