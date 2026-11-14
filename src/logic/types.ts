/**
 * Definisi seluruh tipe data untuk Engine Aljabar Boolean (`src/logic`).
 * Dirancang menggunakan Discriminated Unions agar TypeScript dapat melakukan
 * penyempitan tipe (type narrowing) secara aman tanpa memerlukan `any`.
 */

/** Kode variabel sensor input pada sistem rumah kaca */
export type SensorVariable = 'P' | 'D' | 'K' | 'G' | 'A' | 'M';

/** Identitas aktuator (mesin output) pada rumah kaca */
export type ActuatorId =
  'waterPump' | 'fan' | 'roofVent' | 'heater' | 'growLight' | 'alarm';

/** Metadata sensor untuk menjelaskan arti tiap variabel Boolean */
export interface SensorDefinition {
  readonly variable: SensorVariable;
  readonly label: string;
  readonly description: string;
}

/** Definisi ekspresi awal dan bentuk sederhana tiap aktuator */
export interface ActuatorDefinition {
  readonly id: ActuatorId;
  readonly label: string;
  readonly defaultExpression: string;
  readonly simplifiedHint: string;
}

/** Jenis token yang dihasilkan oleh proses lexical analysis (tokenizer) */
export type TokenType =
  | 'VARIABLE'
  | 'CONSTANT'
  | 'NOT'
  | 'AND'
  | 'OR'
  | 'XOR'
  | 'LPAREN'
  | 'RPAREN'
  | 'EOF';

/** Struktur token tunggal beserta posisi indeks karakternya untuk pelaporan error */
export interface Token {
  readonly type: TokenType;
  readonly value: string;
  readonly position: number;
}

/** Operator biner yang didukung pada AST */
export type BinaryOperator = 'AND' | 'OR' | 'XOR';

/** Node konstanta Boolean (0 atau 1) */
export interface ConstantNode {
  readonly type: 'CONSTANT';
  readonly value: boolean;
}

/** Node variabel input (misal P, D, K, G, A, M) */
export interface VariableNode {
  readonly type: 'VARIABLE';
  readonly name: string;
}

/** Node operasi uner NOT (negasi / komplemen) */
export interface NotNode {
  readonly type: 'NOT';
  readonly operand: ASTNode;
}

/** Node operasi biner (AND, OR, XOR) */
export interface BinaryNode {
  readonly type: 'BINARY';
  readonly operator: BinaryOperator;
  readonly left: ASTNode;
  readonly right: ASTNode;
}

/** Gabungan seluruh tipe node pada Abstract Syntax Tree (AST) */
export type ASTNode = ConstantNode | VariableNode | NotNode | BinaryNode;

/** Satu baris pada tabel kebenaran */
export interface TruthTableRow {
  /** Indeks minterm (0 hingga 2^n - 1) */
  readonly index: number;
  /** Nilai kebenaran masing-masing variabel pada baris ini */
  readonly assignment: Readonly<Record<string, boolean>>;
  /** Hasil evaluasi murni dari ekspresi Boolean (true / false) */
  readonly result: boolean;
  /** Menandai apakah baris ini merupakan kondisi don't-care (misal P dan D true bersamaan) */
  readonly isDontCare: boolean;
  /** Simbol output untuk ditampilkan di tabel: '1', '0', atau 'X' (don't-care) */
  readonly outputSymbol: '0' | '1' | 'X';
}

/** Opsi pembuatan tabel kebenaran */
export interface TruthTableOptions {
  /** Daftar variabel eksplisit jika ingin mengunci urutan kolom tertentu */
  readonly variables?: readonly string[];
  /** Predikat kustom untuk menentukan apakah suatu baris bernilai don't-care */
  readonly dontCarePredicate?: (
    assignment: Readonly<Record<string, boolean>>,
  ) => boolean;
  /**
   * Jika true (default), otomatis menerapkan constraint fisik rumah kaca
   * bahwa P (panas) dan D (dingin) tidak mungkin true bersamaan.
   */
  readonly applyGreenhouseConstraint?: boolean;
}

/** Struktur tabel kebenaran lengkap */
export interface TruthTable {
  readonly variables: readonly string[];
  readonly rows: readonly TruthTableRow[];
  readonly minterms: readonly number[];
  readonly dontCares: readonly number[];
}

/** Struktur Prime Implicant pada algoritma Quine-McCluskey */
export interface PrimeImplicant {
  /** Pola bit implicant, misal '1-0' (1 = variabel, 0 = komplemen, - = tereliminasi) */
  readonly pattern: string;
  /** Daftar indeks minterm atau don't-care yang dicakup oleh implicant ini */
  readonly coveredTerms: readonly number[];
  /** Representasi ekspresi suku konjungsi (product term), misal 'K ∧ A' */
  readonly termExpression: string;
  /** Menandai apakah implicant ini termasuk dalam solusi SOP minimal akhir */
  readonly isSelected: boolean;
}

/** Hasil penyederhanaan algoritma Quine-McCluskey */
export interface QuineMcCluskeyResult {
  readonly originalExpression: string;
  readonly minimalExpression: string;
  readonly minimalAST: ASTNode;
  readonly variables: readonly string[];
  readonly minterms: readonly number[];
  readonly dontCares: readonly number[];
  readonly primeImplicants: readonly PrimeImplicant[];
  readonly selectedImplicants: readonly PrimeImplicant[];
}

/** Jenis hukum Aljabar Boolean yang dikenali oleh sistem edukasi */
export type BooleanLawId =
  | 'DOUBLE_NEGATION'
  | 'DE_MORGAN'
  | 'IDENTITY'
  | 'DOMINATION'
  | 'IDEMPOTENT'
  | 'COMPLEMENT'
  | 'ABSORPTION'
  | 'DISTRIBUTIVE'
  | 'DONT_CARE_CONSTRAINT'
  | 'QUINE_MCCLUSKEY';

/** Informasi referensi satu hukum Aljabar Boolean untuk panel pembelajaran */
export interface BooleanLawInfo {
  readonly id: BooleanLawId;
  readonly name: string;
  readonly formulas: readonly string[];
  readonly description: string;
}

/** Satu langkah transformasi dalam proses penyederhanaan ekspresi Boolean */
export interface SimplificationStep {
  readonly stepNumber: number;
  readonly lawId: BooleanLawId;
  readonly lawName: string;
  readonly lawFormula: string;
  readonly beforeExpression: string;
  readonly afterExpression: string;
  readonly explanation: string;
}

/** Hasil lengkap penyederhanaan bertahap beserta hasil akhir SOP minimal */
export interface SimplificationResult {
  readonly originalExpression: string;
  readonly simplifiedExpression: string;
  readonly simplifiedAST: ASTNode;
  readonly steps: readonly SimplificationStep[];
  readonly quineMcCluskey: QuineMcCluskeyResult;
}

/** Opsi pemeriksaan ekuivalensi dua ekspresi Boolean */
export interface EquivalenceOptions {
  readonly variables?: readonly string[];
  /** Jika true (default), baris don't-care (P ∧ D) diabaikan saat membandingkan output */
  readonly ignoreDontCare?: boolean;
  readonly dontCarePredicate?: (
    assignment: Readonly<Record<string, boolean>>,
  ) => boolean;
}

/** Hasil pemeriksaan ekuivalensi dua ekspresi Boolean */
export interface EquivalenceResult {
  readonly isEquivalent: boolean;
  readonly variables: readonly string[];
  /** Contoh kondisi input yang menghasilkan output berbeda (null jika ekuivalen) */
  readonly counterExample: Readonly<Record<string, boolean>> | null;
}

/** Tipe node pada diagram rangkaian gerbang logika */
export type GateNodeKind = 'INPUT' | 'CONSTANT' | 'NOT' | 'AND' | 'OR' | 'XOR';

/** Node tunggal dalam graf gerbang logika untuk dirender ke SVG */
export interface GateNode {
  readonly id: string;
  readonly kind: GateNodeKind;
  readonly label: string;
  /** Indeks kolom kedalaman dari kiri (0 = input) ke kanan (output) */
  readonly depth: number;
  /** Indeks urutan vertikal pada kolom yang sama */
  readonly row: number;
  /** Daftar ID node yang menjadi input langsung ke gerbang ini */
  readonly inputIds: readonly string[];
  /** Sub-ekspresi yang diwakili oleh node ini (berguna untuk tooltip/inspeksi) */
  readonly expressionText: string;
}

/** Kabel penghubung antar gerbang pada rangkaian logika */
export interface GateWire {
  readonly id: string;
  readonly fromNodeId: string;
  readonly toNodeId: string;
  readonly inputIndex: number;
}

/** Struktur graf gerbang logika lengkap hasil konversi dari AST */
export interface GateGraph {
  readonly nodes: readonly GateNode[];
  readonly wires: readonly GateWire[];
  readonly rootNodeId: string;
  readonly maxDepth: number;
}
