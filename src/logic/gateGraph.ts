/**
 * Konverter Abstract Syntax Tree (AST) menjadi Graf Rangkaian Gerbang Logika (GateGraph).
 * Menghasilkan daftar node (gerbang & terminal input) beserta kabel penghubung (wires)
 * dan posisi kolom/baris (depth & row) agar siap digambar sebagai diagram SVG di UI.
 */

import { formatAST, parseExpression } from './parser';
import type { ASTNode, GateGraph, GateNode, GateWire } from './types';

interface MutableGateNode {
  id: string;
  kind: GateNode['kind'];
  label: string;
  depth: number;
  row: number;
  inputIds: string[];
  expressionText: string;
}

/**
 * Mengonversi ekspresi Boolean atau AST menjadi struktur graf gerbang logika (`GateGraph`).
 * Terminal variabel yang sama digabungkan pada kolom input paling kiri (`depth = 0`)
 * menyerupai skema rangkaian digital standar.
 */
export function buildGateGraph(expressionOrAst: string | ASTNode): GateGraph {
  const ast =
    typeof expressionOrAst === 'string'
      ? parseExpression(expressionOrAst)
      : expressionOrAst;

  const nodes: MutableGateNode[] = [];
  const wires: GateWire[] = [];
  const inputNodeByVar = new Map<string, MutableGateNode>();
  let gateCounter = 0;
  let wireCounter = 0;

  function visit(node: ASTNode): MutableGateNode {
    switch (node.type) {
      case 'VARIABLE': {
        const existing = inputNodeByVar.get(node.name);
        if (existing) {
          return existing;
        }
        const varNode: MutableGateNode = {
          id: `input-${node.name}`,
          kind: 'INPUT',
          label: node.name,
          depth: 0,
          row: 0,
          inputIds: [],
          expressionText: node.name,
        };
        inputNodeByVar.set(node.name, varNode);
        nodes.push(varNode);
        return varNode;
      }

      case 'CONSTANT': {
        gateCounter += 1;
        const constText = node.value ? '1' : '0';
        const constNode: MutableGateNode = {
          id: `const-${gateCounter}`,
          kind: 'CONSTANT',
          label: constText,
          depth: 0,
          row: 0,
          inputIds: [],
          expressionText: constText,
        };
        nodes.push(constNode);
        return constNode;
      }

      case 'NOT': {
        const child = visit(node.operand);
        gateCounter += 1;
        const gateId = `gate-${gateCounter}`;
        const notNode: MutableGateNode = {
          id: gateId,
          kind: 'NOT',
          label: 'NOT',
          depth: child.depth + 1,
          row: 0,
          inputIds: [child.id],
          expressionText: formatAST(node),
        };
        nodes.push(notNode);

        wireCounter += 1;
        wires.push({
          id: `wire-${wireCounter}`,
          fromNodeId: child.id,
          toNodeId: gateId,
          inputIndex: 0,
        });

        return notNode;
      }

      case 'BINARY': {
        const leftChild = visit(node.left);
        const rightChild = visit(node.right);
        gateCounter += 1;
        const gateId = `gate-${gateCounter}`;
        const depth = Math.max(leftChild.depth, rightChild.depth) + 1;

        const binaryNode: MutableGateNode = {
          id: gateId,
          kind: node.operator,
          label: node.operator,
          depth,
          row: 0,
          inputIds: [leftChild.id, rightChild.id],
          expressionText: formatAST(node),
        };
        nodes.push(binaryNode);

        wireCounter += 1;
        wires.push({
          id: `wire-${wireCounter}`,
          fromNodeId: leftChild.id,
          toNodeId: gateId,
          inputIndex: 0,
        });

        wireCounter += 1;
        wires.push({
          id: `wire-${wireCounter}`,
          fromNodeId: rightChild.id,
          toNodeId: gateId,
          inputIndex: 1,
        });

        return binaryNode;
      }
    }
  }

  const root = visit(ast);

  // Tetapkan indeks baris (row) pada setiap kolom kedalaman (depth) agar terurut rapi
  const depthCounters = new Map<number, number>();
  let maxDepth = 0;

  for (const n of nodes) {
    const currentRow = depthCounters.get(n.depth) ?? 0;
    n.row = currentRow;
    depthCounters.set(n.depth, currentRow + 1);
    if (n.depth > maxDepth) {
      maxDepth = n.depth;
    }
  }

  return {
    nodes,
    wires,
    rootNodeId: root.id,
    maxDepth,
  };
}
