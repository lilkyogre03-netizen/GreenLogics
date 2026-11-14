/**
 * Tokenizer (Lexer) dan Recursive Descent Parser untuk ekspresi Aljabar Boolean.
 * Mendukung simbol matematika (¬, ∧, ∨, ⊕), simbol pemrograman (!, ~, &, |, ^, +, *),
 * serta kata kunci teks (NOT, AND, OR, XOR) dengan pesan error bahasa Indonesia.
 */

import type { ASTNode, BinaryOperator, Token, TokenType } from './types';

/**
 * Class error khusus untuk kesalahan sintaks ekspresi Boolean.
 * Menyimpan indeks karakter (`position`) agar UI dapat menunjukkan letak kesalahan.
 */
export class BooleanParseError extends Error {
  public readonly position: number;

  constructor(message: string, position: number) {
    super(message);
    this.name = 'BooleanParseError';
    this.position = position;
  }
}

/**
 * Mengubah string ekspresi Boolean menjadi deretan token (Lexical Analysis).
 */
export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < input.length) {
    const ch = input[i];
    if (ch === undefined) {
      break;
    }

    // Lewati karakter whitespace (spasi, tab, baris baru)
    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }

    // Tanda kurung buka & tutup
    if (ch === '(') {
      tokens.push({ type: 'LPAREN', value: '(', position: i });
      i += 1;
      continue;
    }

    if (ch === ')') {
      tokens.push({ type: 'RPAREN', value: ')', position: i });
      i += 1;
      continue;
    }

    // Konstanta Boolean 0 dan 1
    if (ch === '0' || ch === '1') {
      tokens.push({ type: 'CONSTANT', value: ch, position: i });
      i += 1;
      continue;
    }

    // Operator NOT simbolik: ¬, !, ~
    if (ch === '¬' || ch === '!' || ch === '~') {
      tokens.push({ type: 'NOT', value: ch, position: i });
      i += 1;
      continue;
    }

    // Operator AND simbolik: ∧, &&, &, *, ·
    if (ch === '∧' || ch === '*' || ch === '·') {
      tokens.push({ type: 'AND', value: ch, position: i });
      i += 1;
      continue;
    }

    if (ch === '&') {
      if (input[i + 1] === '&') {
        tokens.push({ type: 'AND', value: '&&', position: i });
        i += 2;
      } else {
        tokens.push({ type: 'AND', value: '&', position: i });
        i += 1;
      }
      continue;
    }

    // Operator OR simbolik: ∨, ||, |, +
    if (ch === '∨' || ch === '+') {
      tokens.push({ type: 'OR', value: ch, position: i });
      i += 1;
      continue;
    }

    if (ch === '|') {
      if (input[i + 1] === '|') {
        tokens.push({ type: 'OR', value: '||', position: i });
        i += 2;
      } else {
        tokens.push({ type: 'OR', value: '|', position: i });
        i += 1;
      }
      continue;
    }

    // Operator XOR simbolik: ⊕, ^
    if (ch === '⊕' || ch === '^') {
      tokens.push({ type: 'XOR', value: ch, position: i });
      i += 1;
      continue;
    }

    // Identifier huruf (variabel tunggal atau kata kunci NOT, AND, OR, XOR, TRUE, FALSE)
    if (/[a-zA-Z]/.test(ch)) {
      const start = i;
      while (i < input.length && /[a-zA-Z0-9_]/.test(input[i] ?? '')) {
        i += 1;
      }
      const rawWord = input.slice(start, i);
      const upperWord = rawWord.toUpperCase();

      if (upperWord === 'NOT') {
        tokens.push({ type: 'NOT', value: rawWord, position: start });
      } else if (upperWord === 'AND') {
        tokens.push({ type: 'AND', value: rawWord, position: start });
      } else if (upperWord === 'OR') {
        tokens.push({ type: 'OR', value: rawWord, position: start });
      } else if (upperWord === 'XOR') {
        tokens.push({ type: 'XOR', value: rawWord, position: start });
      } else if (upperWord === 'TRUE') {
        tokens.push({ type: 'CONSTANT', value: '1', position: start });
      } else if (upperWord === 'FALSE') {
        tokens.push({ type: 'CONSTANT', value: '0', position: start });
      } else if (upperWord.length === 1 && /^[A-Z]$/.test(upperWord)) {
        tokens.push({ type: 'VARIABLE', value: upperWord, position: start });
      } else {
        throw new BooleanParseError(
          `Identifier "${rawWord}" pada posisi ${start} tidak valid. Gunakan variabel satu huruf (misal P, D, K, G, A, M) atau pisahkan variabel dengan operator (∧, ∨, ¬, XOR).`,
          start,
        );
      }
      continue;
    }

    throw new BooleanParseError(
      `Karakter tidak dikenal "${ch}" pada posisi ${i}. Gunakan variabel (P, D, K, G, A, M), konstanta (0, 1), atau operator (¬, ∧, ∨, XOR).`,
      i,
    );
  }

  tokens.push({ type: 'EOF', value: '', position: input.length });
  return tokens;
}

/**
 * Kelas internal Recursive Descent Parser untuk membangun pohon sintaks (AST)
 * dengan urutan presedensi: () > NOT > AND > XOR > OR.
 */
class RecursiveDescentParser {
  private readonly tokens: readonly Token[];
  private current = 0;

  constructor(tokens: readonly Token[]) {
    this.tokens = tokens;
  }

  public parse(): ASTNode {
    const firstToken = this.peek();
    if (firstToken.type === 'EOF') {
      throw new BooleanParseError(
        'Ekspresi Boolean tidak boleh kosong.',
        firstToken.position,
      );
    }

    const ast = this.parseOr();

    const remaining = this.peek();
    if (remaining.type !== 'EOF') {
      if (remaining.type === 'RPAREN') {
        throw new BooleanParseError(
          `Tanda kurung tutup ")" pada posisi ${remaining.position} tidak memiliki pasangan kurung buka "(".`,
          remaining.position,
        );
      }
      throw new BooleanParseError(
        `Token "${remaining.value}" pada posisi ${remaining.position} tidak terduga. Pastikan terdapat operator biner (∧, ∨, XOR) di antara dua operan.`,
        remaining.position,
      );
    }

    return ast;
  }

  // Level 1 (terendah): OR (∨, |) - asosiatif kiri
  private parseOr(): ASTNode {
    let left = this.parseXor();

    while (this.peek().type === 'OR') {
      const operatorToken = this.advance();
      this.ensureRightOperand(operatorToken, 'OR (∨)');
      const right = this.parseXor();
      left = {
        type: 'BINARY',
        operator: 'OR',
        left,
        right,
      };
    }

    return left;
  }

  // Level 2: XOR (⊕, ^, XOR) - asosiatif kiri
  private parseXor(): ASTNode {
    let left = this.parseAnd();

    while (this.peek().type === 'XOR') {
      const operatorToken = this.advance();
      this.ensureRightOperand(operatorToken, 'XOR (⊕)');
      const right = this.parseAnd();
      left = {
        type: 'BINARY',
        operator: 'XOR',
        left,
        right,
      };
    }

    return left;
  }

  // Level 3: AND (∧, &) - asosiatif kiri
  private parseAnd(): ASTNode {
    let left = this.parseNot();

    while (this.peek().type === 'AND') {
      const operatorToken = this.advance();
      this.ensureRightOperand(operatorToken, 'AND (∧)');
      const right = this.parseNot();
      left = {
        type: 'BINARY',
        operator: 'AND',
        left,
        right,
      };
    }

    return left;
  }

  // Level 4: NOT (¬, !) - unary prefix, asosiatif kanan
  private parseNot(): ASTNode {
    if (this.peek().type === 'NOT') {
      const operatorToken = this.advance();
      const next = this.peek();
      if (
        next.type === 'EOF' ||
        next.type === 'RPAREN' ||
        next.type === 'AND' ||
        next.type === 'OR' ||
        next.type === 'XOR'
      ) {
        throw new BooleanParseError(
          `Operator negasi "${operatorToken.value}" pada posisi ${operatorToken.position} membutuhkan operan setelahnya.`,
          operatorToken.position,
        );
      }
      const operand = this.parseNot();
      return {
        type: 'NOT',
        operand,
      };
    }

    return this.parsePrimary();
  }

  // Level 5 (tertinggi): Variabel, Konstanta, atau Tanda Kurung (...)
  private parsePrimary(): ASTNode {
    const token = this.peek();

    if (token.type === 'VARIABLE') {
      this.advance();
      return {
        type: 'VARIABLE',
        name: token.value,
      };
    }

    if (token.type === 'CONSTANT') {
      this.advance();
      return {
        type: 'CONSTANT',
        value: token.value === '1',
      };
    }

    if (token.type === 'LPAREN') {
      const openParen = this.advance();
      if (this.peek().type === 'RPAREN') {
        throw new BooleanParseError(
          `Tanda kurung kosong "()" pada posisi ${openParen.position} tidak diizinkan.`,
          openParen.position,
        );
      }

      const expr = this.parseOr();

      if (this.peek().type !== 'RPAREN') {
        throw new BooleanParseError(
          `Tanda kurung buka "(" pada posisi ${openParen.position} tidak memiliki pasangan kurung tutup ")".`,
          openParen.position,
        );
      }
      this.advance(); // konsumsi ')'
      return expr;
    }

    if (token.type === 'AND' || token.type === 'OR' || token.type === 'XOR') {
      throw new BooleanParseError(
        `Operator biner "${token.value}" pada posisi ${token.position} kehilangan operan kiri.`,
        token.position,
      );
    }

    if (token.type === 'RPAREN') {
      throw new BooleanParseError(
        `Tanda kurung tutup ")" pada posisi ${token.position} muncul tanpa ekspresi sebelumnya.`,
        token.position,
      );
    }

    throw new BooleanParseError(
      `Diharapkan variabel, konstanta (0/1), atau tanda kurung pada posisi ${token.position}.`,
      token.position,
    );
  }

  private ensureRightOperand(operatorToken: Token, label: string): void {
    const next = this.peek();
    if (next.type === 'EOF' || next.type === 'RPAREN') {
      throw new BooleanParseError(
        `Operator biner ${label} ("${operatorToken.value}") pada posisi ${operatorToken.position} kehilangan operan kanan.`,
        operatorToken.position,
      );
    }
    if (next.type === 'AND' || next.type === 'OR' || next.type === 'XOR') {
      throw new BooleanParseError(
        `Operator biner "${next.value}" pada posisi ${next.position} tidak boleh langsung mengikuti operator "${operatorToken.value}".`,
        next.position,
      );
    }
  }

  private peek(): Token {
    const token = this.tokens[this.current];
    if (!token) {
      return { type: 'EOF', value: '', position: 0 };
    }
    return token;
  }

  private advance(): Token {
    const token = this.peek();
    if (token.type !== 'EOF') {
      this.current += 1;
    }
    return token;
  }
}

/**
 * Mengurai (parse) string ekspresi Boolean menjadi Abstract Syntax Tree (AST).
 * Melempar `BooleanParseError` apabila sintaks tidak valid.
 */
export function parseExpression(input: string): ASTNode {
  const tokens = tokenize(input);
  const parser = new RecursiveDescentParser(tokens);
  return parser.parse();
}

/** Simbol matematika kanonik untuk setiap operator biner */
const OPERATOR_SYMBOL: Readonly<Record<BinaryOperator, string>> = {
  AND: '∧',
  OR: '∨',
  XOR: '⊕',
};

/**
 * Mengubah kembali AST menjadi string ekspresi Boolean ternormalisasi
 * menggunakan simbol standar (¬, ∧, ∨, ⊕).
 * Tanda kurung ditambahkan otomatis ketika operator biner anak berbeda dengan induknya
 * agar ekspresi seperti `(K ∧ A) ∨ (K ∧ A ∧ ¬P)` mudah dibaca oleh mahasiswa.
 */
export function formatAST(node: ASTNode): string {
  switch (node.type) {
    case 'CONSTANT':
      return node.value ? '1' : '0';
    case 'VARIABLE':
      return node.name;
    case 'NOT': {
      const inner = formatAST(node.operand);
      if (node.operand.type === 'BINARY' || node.operand.type === 'NOT') {
        return `¬(${inner})`;
      }
      return `¬${inner}`;
    }
    case 'BINARY': {
      const symbol = OPERATOR_SYMBOL[node.operator];
      const leftText =
        node.left.type === 'BINARY' && node.left.operator !== node.operator
          ? `(${formatAST(node.left)})`
          : formatAST(node.left);
      const rightText =
        node.right.type === 'BINARY' && node.right.operator !== node.operator
          ? `(${formatAST(node.right)})`
          : formatAST(node.right);
      return `${leftText} ${symbol} ${rightText}`;
    }
  }
}

/**
 * Mengekstrak daftar nama variabel unik sesuai urutan kemunculannya di dalam ekspresi/AST.
 */
export function extractVariables(expressionOrAst: string | ASTNode): string[] {
  const ast =
    typeof expressionOrAst === 'string'
      ? parseExpression(expressionOrAst)
      : expressionOrAst;

  const seen = new Set<string>();
  const result: string[] = [];

  function walk(node: ASTNode): void {
    switch (node.type) {
      case 'CONSTANT':
        return;
      case 'VARIABLE':
        if (!seen.has(node.name)) {
          seen.add(node.name);
          result.push(node.name);
        }
        return;
      case 'NOT':
        walk(node.operand);
        return;
      case 'BINARY':
        walk(node.left);
        walk(node.right);
        return;
    }
  }

  walk(ast);
  return result;
}

/** Mengecek apakah tipe token termasuk token yang valid */
export function isTokenType(type: TokenType): boolean {
  return type !== 'EOF';
}
